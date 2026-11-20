/* =====================================================================
   guide.js  -  Everything a Tour Guide can do (guide.html)
   ---------------------------------------------------------------------
   Unique 1      : Assigned Tour Schedule (cards + tour status update)
   Unique 2      : Customized Route Change (add / remove / move stops)
   Unique 3      : Guidelines & Notices
   CRUD + Search : Notices (notices array)
   ===================================================================== */

const sections = ["scheduleSection", "routeSection", "noticesSection"];

// The guide who is logged in: found from the address bar (later: $_SESSION['user_id'])
let currentGuideId = "U-003";
let loggedInUser = getLoggedInUser();
if (loggedInUser !== null) {
  currentGuideId = loggedInUser.id;
}
showWelcomeName(currentGuideId);

let editNoticeIndex = -1;

// The stops being edited in the route section (a copy of the real route)
let editStops = [];


/* =====================================================================
   HELPERS FOR THIS PAGE
   ===================================================================== */

// Returns an array with the bookings this guide is assigned to
function getMyTours() {
  let myTours = [];
  for (let i = 0; i < bookings.length; i++) {
    let booking = bookings[i];
    if (booking.guideId === currentGuideId) {
      myTours.push(booking);
    }
  }
  return myTours;
}

// Fills a <select> with this guide's tours that are not completed
function fillTourSelect(selectId, firstText) {
  let select = document.getElementById(selectId);
  select.innerHTML = "<option value=''>" + firstText + "</option>";

  let bookingList = getMyTours();
  for (let i = 0; i < bookingList.length; i++) {
    let booking = bookingList[i];
    if (booking.tourStatus !== "Completed") {
      let option = document.createElement("option");
      option.value = booking.id;
      option.innerHTML = booking.packageName + " (" + booking.travelDate + ")";
      select.appendChild(option);
    }
  }
}


/* =====================================================================
   UNIQUE FEATURE 1: ASSIGNED TOUR SCHEDULE
   Each tour gets a coloured card:
     orange = starts within 3 days, blue = in progress, green = later,
     grey = completed, red = delayed
   ===================================================================== */
function renderSchedule() {
  let filter = document.getElementById("scheduleFilter").value;
  let list = document.getElementById("scheduleList");
  let today = todayString();
  let myTours = getMyTours();

  let upcoming = 0;
  let running = 0;
  let done = 0;

  list.innerHTML = "";

  for (let i = 0; i < myTours.length; i++) {
    let booking = myTours[i];
    // Count for the stat cards
    if (booking.tourStatus === "Completed") {
      done++;
    } else if (booking.tourStatus === "In Progress") {
      running++;
    } else {
      upcoming++;
    }

    // Skip tours that do not match the filter
    let isDone = (booking.tourStatus === "Completed");
    if ((filter === "Upcoming" && isDone) || (filter === "Completed" && isDone === false)) {
      continue;
    }

    let daysLeft = daysBetween(today, booking.travelDate);
    let color;
    let background;
    let when;

    if (isDone) {
      color = "#6C757D";
      background = "#F5F5F5";
      when = "Finished on " + getEndDate(booking);
    } else if (booking.tourStatus === "Delayed") {
      color = "#C62828";
      background = "#FFEBEE";
      when = "Delayed. Please update the tourists.";
    } else if (booking.tourStatus === "In Progress") {
      color = "#1565C0";
      background = "#E3F2FD";
      when = "On the tour now.";
    } else if (daysLeft <= 3) {
      color = "#EF6C00";
      background = "#FFF3E0";
      if (daysLeft <= 0) {
        when = "Starts today!";
      } else {
        when = "Starts in " + daysLeft + " day(s).";
      }
    } else {
      color = "#2E7D32";
      background = "#F1F8F1";
      when = "Starts in " + daysLeft + " days.";
    }

    // Tourist group, vehicle and special requests of this tour
    let tourist = findById(users, booking.touristId);
    let vehicle = getVehicleForBooking(booking.id);
    let vehicleText = "<span class='hint'>Not booked yet</span>";
    if (vehicle !== null) {
      vehicleText = vehicle.type + " " + vehicle.number + " &middot; Driver " + vehicle.driver + " (" + vehicle.driverPhone + ")";
    }

    let requestText = "";
    for (let j = 0; j < specialRequests.length; j++) {
      let request = specialRequests[j];
      if (request.bookingId === booking.id && request.status !== "Declined") {
        requestText += "<br>&bull; " + request.type + ": " + request.details + " " + statusBadge(request.status);
      }
    }

    // Build the card with createElement and change its style with the DOM
    let card = document.createElement("div");
    card.className = "reminder";
    card.style.borderLeftColor = color;
    card.style.backgroundColor = background;

    let html = "<h4>" + booking.packageName + " " + statusBadge(booking.tourStatus) + "</h4>" +
               "<p class='hint'>" + booking.id + " &middot; " + booking.travelDate + " to " + getEndDate(booking) + "</p>" +
               "<p><strong>" + when + "</strong></p>" +
               "<p><strong>Tourists:</strong> " + tourist.name + " + " + (booking.persons - 1) + " more (" +
               booking.persons + " persons) &middot; " + tourist.phone + " &middot; Pickup: " + booking.pickup + "</p>" +
               "<p><strong>Vehicle:</strong> " + vehicleText + "</p>" +
               "<p><strong>Route:</strong> " + showRoute(getBookingRoute(booking)) + "</p>";
    if (requestText !== "") {
      html += "<p><strong>Special requests:</strong>" + requestText + "</p>";
    }

    if (isDone === false) {
      let index = findIndexById(bookings, booking.id);
      html += "<p class='form-buttons'>" +
                "<select id='status-" + booking.id + "' class='inline-input'>" +
                  "<option value='Scheduled'>Scheduled</option>" +
                  "<option value='In Progress'>In Progress</option>" +
                  "<option value='Delayed'>Delayed</option>" +
                  "<option value='Completed'>Completed</option>" +
                "</select> " +
                "<button type='button' class='btn btn-small' onclick='updateTourStatus(" + index + ")'>Update Status</button>" +
                "<button type='button' class='btn btn-small btn-secondary' onclick=\"goToRoute('" + booking.id + "')\">Change Route</button>" +
              "</p>";
    }

    card.innerHTML = html;
    list.appendChild(card);

    // Select the current status in the drop-down
    if (isDone === false) {
      document.getElementById("status-" + booking.id).value = booking.tourStatus;
    }
  }

  if (list.innerHTML === "") {
    list.innerHTML = "<p class='empty-row'>No tours in this list.</p>";
  }

  document.getElementById("statUpcoming").innerHTML = upcoming;
  document.getElementById("statRunning").innerHTML = running;
  document.getElementById("statDone").innerHTML = done;
  document.getElementById("scheduleSummary").innerHTML =
    "You are assigned to " + myTours.length + " tour(s). Today is " + today + ".";

  // My average guide rating from the reviews
  let myReviews = [];
  for (let i = 0; i < reviews.length; i++) {
    let review = reviews[i];
    if (review.guideId === currentGuideId) {
      myReviews.push(review);
    }
  }
  let rating = averageRating(myReviews, "guideRating");
  if (rating === 0) {
    document.getElementById("statRating").innerHTML = "-";
  } else {
    document.getElementById("statRating").innerHTML = rating;
  }
}


function updateTourStatus(index) {
  let booking = bookings[index];
  let newStatus = document.getElementById("status-" + booking.id).value;
  hideMessage("scheduleMessage");

  // A tour can not be finished before it starts
  if (newStatus === "Completed" && daysBetween(todayString(), booking.travelDate) > 0) {
    showMessage("scheduleMessage", "You can not complete <strong>" + booking.packageName +
                "</strong> before its travel date (" + booking.travelDate + ").", "error");
    return;
  }

  booking.tourStatus = newStatus;

  // Finishing the tour also finishes the booking and frees the vehicle,
  // so the tourist can now write a review
  if (newStatus === "Completed") {
    booking.status = "Completed";
    for (let i = 0; i < vehicleBookings.length; i++) {
      let vb = vehicleBookings[i];
      if (vb.bookingId === booking.id && vb.status === "Booked") {
        vb.status = "Released";
      }
    }
  }

  showMessage("scheduleMessage", "Status of <strong>" + booking.packageName + "</strong> changed to " + newStatus + ".", "success");
  renderSchedule();
  fillTourSelect("routeTour", "-- Select Tour --");
}


// Warnings the admin sent to this guide (from the action log)
function renderWarnings() {
  let html = "";
  for (let i = 0; i < actionLog.length; i++) {
    let entry = actionLog[i];
    if (entry.type === "Guide" && entry.targetId === currentGuideId) {
      html += "<div class='message error' style='display:block'><strong>Message from admin (" + entry.action +
              "):</strong> " + entry.note + " <span class='hint'>" + entry.time + "</span></div>";
    }
  }
  document.getElementById("adminWarnings").innerHTML = html;
}


/* =====================================================================
   UNIQUE FEATURE 2: CUSTOMIZED ROUTE CHANGE
   editStops is a COPY of the route (slice()), so nothing changes
   until the guide presses "Save New Route".
   ===================================================================== */
function goToRoute(bookingId) {
  showSection("routeSection");
  document.getElementById("routeTour").value = bookingId;
  loadRouteStops();
}

function loadRouteStops() {
  let bookingId = document.getElementById("routeTour").value;
  clearErrors(["routeTour", "stopList", "newStop", "routeReason"]);

  if (bookingId === "") {
    editStops = [];
    document.getElementById("routeInfo").innerHTML = "Choose a tour to edit its route.";
    renderStops();
    return;
  }

  let booking = findById(bookings, bookingId);
  let pack = findById(packages, booking.packageId);
  editStops = getBookingRoute(booking).slice();      // slice() makes a copy of the array

  let info = "<p><strong>" + booking.packageName + "</strong> &middot; " + booking.travelDate + "</p>" +
             "<p>Package route:<br>" + showRoute(pack.route) + "</p>";
  if (booking.customRoute.length > 0) {
    info += "<p>Current route <span class='badge orange'>Custom</span><br>" + showRoute(booking.customRoute) + "</p>";
  }
  document.getElementById("routeInfo").innerHTML = info;
  renderStops();
}

// Draws the list of stops with Up, Down and Remove buttons
function renderStops() {
  let html = "";
  for (let i = 0; i < editStops.length; i++) {
    let upButton = "";
    if (i > 0) {
      upButton = "<button type='button' class='btn btn-small btn-secondary' onclick='moveStop(" + i + ", -1)'>&uarr;</button>";
    }
    let downButton = "";
    if (i < editStops.length - 1) {
      downButton = "<button type='button' class='btn btn-small btn-secondary' onclick='moveStop(" + i + ", 1)'>&darr;</button>";
    }

    html += "<li>" +
              "<span class='stop-number'>" + (i + 1) + "</span>" +
              "<span class='stop-name'>" + editStops[i] + "</span>" +
              upButton + downButton +
              "<button type='button' class='btn btn-small btn-danger' onclick='removeStop(" + i + ")'>&times;</button>" +
            "</li>";
  }
  if (html === "") {
    html = "<li class='hint'>No stops. Choose a tour first.</li>";
  }
  document.getElementById("stopList").innerHTML = html;
}

function addStop() {
  let input = document.getElementById("newStop");
  let name = input.value.trim();
  clearError("newStop");

  if (document.getElementById("routeTour").value === "") {
    showError("newStop", "Choose a tour first.");
    return;
  }
  if (name.length < 3) {
    showError("newStop", "Stop name must be at least 3 characters.");
    return;
  }
  // A loop checks that the stop is not already in the route
  for (let i = 0; i < editStops.length; i++) {
    let stop = editStops[i];
    if (stop.toLowerCase() === name.toLowerCase()) {
      showError("newStop", "This stop is already in the route.");
      return;
    }
  }

  editStops.push(name);
  input.value = "";
  renderStops();
}

function removeStop(index) {
  editStops = removeAt(editStops, index);
  renderStops();
}

// direction is -1 (up) or 1 (down): swap the stop with its neighbour
function moveStop(index, direction) {
  let other = index + direction;
  let temp = editStops[index];
  editStops[index] = editStops[other];
  editStops[other] = temp;
  renderStops();
}

function fillReason() {
  let reason = document.getElementById("routeReasonType").value;
  if (reason !== "") {
    document.getElementById("routeReason").value = reason;
  }
}

function saveRoute() {
  let bookingId = document.getElementById("routeTour").value;
  let reason = document.getElementById("routeReason").value.trim();
  let isValid = true;

  clearErrors(["routeTour", "stopList", "newStop", "routeReason"]);
  hideMessage("routeMessage");

  if (bookingId === "") {
    showError("routeTour", "Choose a tour.");
    return false;
  }

  let booking = findById(bookings, bookingId);
  let oldRoute = getBookingRoute(booking);

  if (editStops.length < 2) {
    showError("stopList", "A route needs at least 2 stops.");
    isValid = false;
  } else if (editStops.join(">") === oldRoute.join(">")) {
    showError("stopList", "You did not change anything in the route.");
    isValid = false;
  }

  if (reason.length < 5) {
    showError("routeReason", "Please write the reason (at least 5 characters).");
    isValid = false;
  }

  if (isValid === false) {
    return false;
  }

  routeChanges.push({ id: nextId("RC", routeChanges), bookingId: booking.id, guideId: currentGuideId,
                      oldRoute: oldRoute, newRoute: editStops.slice(), reason: reason, date: todayString() });
  booking.customRoute = editStops.slice();
  console.log("New route:", booking.customRoute);

  showMessage("routeMessage", "Route of <strong>" + booking.packageName + "</strong> was changed. The tourists can see it now.", "success");
  document.getElementById("routeForm").reset();
  loadRouteStops();
  renderRouteHistory();
  renderSchedule();
  return false;
}

function resetToPackageRoute() {
  let bookingId = document.getElementById("routeTour").value;
  if (bookingId === "") {
    showError("routeTour", "Choose a tour.");
    return;
  }
  let booking = findById(bookings, bookingId);
  if (booking.customRoute.length === 0) {
    showMessage("routeMessage", "This tour already follows the package route.", "info");
    return;
  }

  let pack = findById(packages, booking.packageId);
  routeChanges.push({ id: nextId("RC", routeChanges), bookingId: booking.id, guideId: currentGuideId,
                      oldRoute: booking.customRoute, newRoute: pack.route, reason: "Back to the package route", date: todayString() });
  booking.customRoute = [];

  showMessage("routeMessage", "The tour is back on the package route.", "info");
  loadRouteStops();
  renderRouteHistory();
  renderSchedule();
}

function renderRouteHistory() {
  let rows = "";
  // Newest first: loop backwards
  for (let i = routeChanges.length - 1; i >= 0; i--) {
    let change = routeChanges[i];
    if (change.guideId === currentGuideId) {
      rows += "<tr><td>" + change.id + "</td><td>" + change.bookingId + "</td><td>" + showRoute(change.oldRoute) +
              "</td><td>" + showRoute(change.newRoute) + "</td><td>" + change.reason + "</td><td>" + change.date + "</td></tr>";
    }
  }
  if (rows === "") {
    rows = "<tr><td colspan='6' class='empty-row'>No route changes yet.</td></tr>";
  }
  document.getElementById("routeHistoryBody").innerHTML = rows;
}


/* =====================================================================
   UNIQUE FEATURE 3: GUIDELINES & NOTICES
   CREATE, READ, UPDATE, DELETE, SEARCH
   ===================================================================== */

// READ + SEARCH: the notice board is filled with createElement
function renderNotices() {
  let keyword = document.getElementById("noticeSearch").value;
  let tourFilter = document.getElementById("noticeTourFilter").value;
  let board = document.getElementById("noticeBoard");
  let shown = 0;
  let mine = 0;

  board.innerHTML = "";

  for (let i = notices.length - 1; i >= 0; i--) {
    let notice = notices[i];
    if (notice.guideId !== currentGuideId) {
      continue;
    }
    mine++;

    let matchesKeyword = containsText(notice.text, keyword) || containsText(notice.bookingId, keyword);
    let isGeneral = (notice.bookingId === "");
    let matchesTour = (tourFilter === "All") || (tourFilter === "General" && isGeneral) ||
                      (tourFilter === "Tour" && isGeneral === false);

    if (matchesKeyword && matchesTour) {
      let forText = "General note";
      if (isGeneral === false) {
        let booking = findById(bookings, notice.bookingId);
        forText = booking.packageName + " (" + booking.travelDate + ")";
      }

      let item = document.createElement("div");
      item.className = "log-item";
      if (isGeneral) {
        item.style.borderLeftColor = "#6C757D";
      } else {
        item.style.borderLeftColor = "#0284C7";
      }
      item.innerHTML = "<span class='log-time'>" + notice.id + " &middot; " + notice.date + " &middot; " + forText + "</span><br>" +
                       notice.text + "<br>" +
                       "<button type='button' class='btn btn-small' onclick='editNotice(" + i + ")'>Edit</button>" +
                       "<button type='button' class='btn btn-small btn-danger' onclick='deleteNotice(" + i + ")'>Delete</button>";
      board.appendChild(item);
      shown++;
    }
  }

  if (shown === 0) {
    board.innerHTML = "<p class='empty-row'>No notices match your search.</p>";
  }
  document.getElementById("noticeCount").innerHTML = "Showing " + shown + " of " + mine + " notices";
}

// CREATE or UPDATE
function saveNotice() {
  let bookingId = document.getElementById("noticeTour").value;
  let text = document.getElementById("noticeText").value.trim();
  clearError("noticeText");
  hideMessage("noticeMessage");

  if (text.length < 10) {
    showError("noticeText", "Please write at least 10 characters.");
    return false;
  } else if (text.length > 250) {
    showError("noticeText", "Please keep it under 250 characters.");
    return false;
  }

  if (editNoticeIndex === -1) {
    let notice = { id: nextId("N", notices), guideId: currentGuideId, bookingId: bookingId, text: text, date: todayString() };
    notices.push(notice);
    showMessage("noticeMessage", "Notice " + notice.id + " was posted.", "success");
  } else {
    let notice = notices[editNoticeIndex];
    notice.bookingId = bookingId;
    notice.text = text;
    showMessage("noticeMessage", "Notice " + notice.id + " was updated.", "success");
  }

  resetNoticeForm();
  renderNotices();
  return false;
}

function editNotice(index) {
  let notice = notices[index];
  editNoticeIndex = index;

  // A completed tour is not in the list any more, so add it back for editing
  let select = document.getElementById("noticeTour");
  select.value = notice.bookingId;
  if (select.value !== notice.bookingId) {
    let option = document.createElement("option");
    option.value = notice.bookingId;
    option.innerHTML = notice.bookingId;
    select.appendChild(option);
    select.value = notice.bookingId;
  }

  document.getElementById("noticeText").value = notice.text;
  countNoticeCharacters();
  document.getElementById("noticeFormTitle").innerHTML = "Edit Notice " + notice.id;
  document.getElementById("noticeSaveButton").value = "Update Notice";
}

function deleteNotice(index) {
  let notice = notices[index];
  if (confirm("Delete notice " + notice.id + "?") === false) {
    return;
  }
  notices = removeAt(notices, index);
  showMessage("noticeMessage", "Notice " + notice.id + " was deleted.", "info");
  resetNoticeForm();
  renderNotices();
}

function resetNoticeForm() {
  editNoticeIndex = -1;
  document.getElementById("noticeForm").reset();
  fillTourSelect("noticeTour", "General note (not for one tour)");
  clearError("noticeText");
  countNoticeCharacters();
  document.getElementById("noticeFormTitle").innerHTML = "New Notice";
  document.getElementById("noticeSaveButton").value = "Post Notice";
}

// Ready-made text for the most common notices (switch)
function useTemplate(kind) {
  let text = "";
  switch (kind) {
    case "meeting":
      text = "Meeting point: hotel lobby at 8:00 AM. Please be on time.";
      break;
    case "safety":
      text = "Safety: always follow the guide, do not go into deep water and wear the life jacket on boats.";
      break;
    case "carry":
      text = "Please carry your NID or passport, drinking water, a cap and a small bag.";
      break;
  }
  document.getElementById("noticeText").value = text;
  countNoticeCharacters();
}

function countNoticeCharacters() {
  let length = document.getElementById("noticeText").value.length;
  let counter = document.getElementById("noticeCounter");
  counter.innerHTML = length + " / 250";
  if (length > 250) {
    counter.style.color = "#C62828";
  } else {
    counter.style.color = "";
  }
}


/* =====================================================================
   START
   ===================================================================== */
renderWarnings();
renderSchedule();
fillTourSelect("routeTour", "-- Select Tour --");
renderStops();
renderRouteHistory();
fillTourSelect("noticeTour", "General note (not for one tour)");
renderNotices();
showSection("scheduleSection");
