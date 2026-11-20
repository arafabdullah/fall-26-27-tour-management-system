/* =====================================================================
   tourist.js  -  Everything a Tourist can do (tourist.html)
   ---------------------------------------------------------------------
   CRUD + Search : My Bookings (bookings array)
   Unique 1      : Payment system (bKash, Nagad, Card) with a receipt
   Unique 2      : Reviews & Ratings for the tour and the guide
   Unique 3      : Special Request to the agency
   Also          : Search the tour packages (renderCatalog in common.js)
   ===================================================================== */

const sections = ["bookingsSection", "paymentSection", "reviewsSection", "requestsSection", "catalogSection"];

// The tourist who is logged in. With the PHP backend this will come
// from the session ($_SESSION) instead of being written here.
let currentTouristId = "U-004";
let loggedInUser = getLoggedInUser();
if (loggedInUser !== null) {
  currentTouristId = loggedInUser.id;
}
let currentTouristName = getUserName(currentTouristId);
showWelcomeName(currentTouristId);

let editBookingIndex = -1;
let editRequestIndex = -1;

const bookingFields = ["bookingPackage", "bookingDate", "bookingPersons", "pickup"];
const paymentFields = ["payBooking", "payMethod", "walletNumber", "walletPin", "cardNumber", "cardExpiry", "cardCvv"];
const reviewFields = ["reviewBooking", "tourRating", "guideRating", "reviewComment"];
const requestFields = ["requestBooking", "requestType", "requestDetails"];


/* =====================================================================
   HELPERS FOR THIS PAGE
   ===================================================================== */

// Seats still free on one package on one date.
// Only approved and completed bookings hold seats.
function seatsLeft(packageId, date, skipIndex) {
  let pack = findById(packages, packageId);
  let taken = 0;
  for (let i = 0; i < bookings.length; i++) {
    let booking = bookings[i];
    if (i !== skipIndex && booking.packageId === packageId && booking.travelDate === date &&
        (booking.status === "Approved" || booking.status === "Completed")) {
      taken += booking.persons;
    }
  }
  return pack.seats - taken;
}

// true if this booking already has a review
function hasReview(bookingId) {
  for (let i = 0; i < reviews.length; i++) {
    let review = reviews[i];
    if (review.bookingId === bookingId) {
      return true;
    }
  }
  return false;
}

// Fills a <select> with this tourist's bookings that pass the test function
// (the test is a function that gets a booking and returns true or false)
function fillBookingSelect(selectId, test) {
  let select = document.getElementById(selectId);
  select.innerHTML = "<option value=''>-- Select Booking --</option>";
  let added = 0;

  for (let i = 0; i < bookings.length; i++) {
    let booking = bookings[i];
    if (booking.touristId === currentTouristId && test(booking)) {
      let option = document.createElement("option");
      option.value = booking.id;
      option.innerHTML = booking.id + " - " + booking.packageName + " (" + booking.travelDate + ")";
      select.appendChild(option);
      added++;
    }
  }
  return added;
}


/* =====================================================================
   MY BOOKINGS: CREATE, READ, UPDATE, DELETE, SEARCH
   ===================================================================== */

// The package drop-down is built with createElement (only active packages)
function loadPackageOptions() {
  let select = document.getElementById("bookingPackage");
  select.innerHTML = "<option value=''>-- Select Package --</option>";

  for (let i = 0; i < packages.length; i++) {
    let pack = packages[i];
    if (pack.status === "Active") {
      let option = document.createElement("option");
      option.value = pack.id;
      option.innerHTML = pack.name + " (" + formatTk(pack.price) + ")";
      select.appendChild(option);
    }
  }
}

// Live price: price x persons, and the seats left on that date
function updateBookingTotal() {
  let packageId = document.getElementById("bookingPackage").value;
  let date = document.getElementById("bookingDate").value;
  let persons = Number(document.getElementById("bookingPersons").value);
  let box = document.getElementById("bookingTotal");

  if (packageId === "") {
    box.innerHTML = "Choose a package to see the price.";
    return;
  }

  let pack = findById(packages, packageId);
  let html = "<p><strong>" + pack.name + "</strong> &middot; " + pack.days + " day(s)</p>" +
             "<p>" + formatTk(pack.price) + " x " + persons + " person(s) = <span class='big'>" +
             formatTk(pack.price * persons) + "</span></p>";

  if (date !== "") {
    let left = seatsLeft(packageId, date, editBookingIndex);
    html += "<p>Seats left on " + date + ": <strong>" + left + "</strong> of " + pack.seats + "</p>";
  }
  html += "<p class='hint'>Route: " + showRoute(pack.route) + "</p>";
  box.innerHTML = html;
}


// READ + SEARCH (only this tourist's bookings)
function renderBookings() {
  let keyword = document.getElementById("bookingSearch").value;
  let statusFilter = document.getElementById("bookingStatusFilter").value;

  let rows = "";
  let shown = 0;
  let mine = 0;

  for (let i = 0; i < bookings.length; i++) {
    let booking = bookings[i];
    let isMine = (booking.touristId === currentTouristId);
    if (isMine) {
      mine++;
    }

    let matchesKeyword = containsText(booking.packageName, keyword) || containsText(booking.id, keyword);
    let matchesStatus = (statusFilter === "All" || booking.status === statusFilter);

    if (isMine && matchesKeyword && matchesStatus) {
      // The buttons depend on the status of the booking
      let actions = "<button type='button' class='btn btn-small btn-secondary' onclick='showBookingDetails(" + i + ")'>Details</button>";

      if (booking.status === "Pending") {
        actions += "<button type='button' class='btn btn-small' onclick='editBooking(" + i + ")'>Edit</button>" +
                   "<button type='button' class='btn btn-small btn-danger' onclick='deleteBooking(" + i + ")'>Cancel</button>";
      } else if (booking.status === "Approved" && booking.payment === "Unpaid") {
        actions += "<button type='button' class='btn btn-small btn-success' onclick=\"goToPayment('" + booking.id + "')\">Pay Now</button>";
      } else if (booking.status === "Completed" && hasReview(booking.id) === false) {
        actions += "<button type='button' class='btn btn-small' onclick=\"goToReview('" + booking.id + "')\">Rate Tour</button>";
      }

      rows += "<tr>" +
                "<td>" + booking.id + "</td>" +
                "<td><strong>" + booking.packageName + "</strong><br><span class='hint'>Pickup: " + booking.pickup + "</span></td>" +
                "<td>" + booking.travelDate + "</td>" +
                "<td>" + booking.persons + "</td>" +
                "<td>" + formatTk(booking.total) + "</td>" +
                "<td>" + statusBadge(booking.status) + "</td>" +
                "<td>" + statusBadge(booking.payment) + "</td>" +
                "<td>" + actions + "</td>" +
              "</tr>";
      shown++;
    }
  }

  if (shown === 0) {
    rows = "<tr><td colspan='8' class='empty-row'>No bookings match your search.</td></tr>";
  }

  document.getElementById("bookingTableBody").innerHTML = rows;
  document.getElementById("bookingCount").innerHTML = "Showing " + shown + " of " + mine + " bookings";
}


// CREATE or UPDATE
function saveBooking() {
  let packageId = document.getElementById("bookingPackage").value;
  let date = document.getElementById("bookingDate").value;
  let personsText = document.getElementById("bookingPersons").value;
  let persons = Number(personsText);
  let pickup = getRadioValue("pickup");

  let isValid = true;
  clearErrors(bookingFields);
  hideMessage("bookingMessage");

  if (packageId === "") {
    showError("bookingPackage", "Please choose a tour package.");
    isValid = false;
  }

  if (date === "") {
    showError("bookingDate", "Please choose a travel date.");
    isValid = false;
  } else if (daysBetween(todayString(), date) < 1) {
    showError("bookingDate", "Travel date must be after today.");
    isValid = false;
  }

  if (personsText === "" || persons < 1 || persons > 10) {
    showError("bookingPersons", "Persons must be from 1 to 10.");
    isValid = false;
  }

  if (pickup === "") {
    showError("pickup", "Choose where we pick you up.");
    isValid = false;
  }

  // Enough seats on that date?
  if (isValid && persons > seatsLeft(packageId, date, editBookingIndex)) {
    showError("bookingPersons", "Only " + seatsLeft(packageId, date, editBookingIndex) + " seats left on that date.");
    isValid = false;
  }

  if (isValid === false) {
    return false;
  }

  let pack = findById(packages, packageId);

  if (editBookingIndex === -1) {
    // CREATE
    let newBooking = { id: nextId("BK", bookings), touristId: currentTouristId, touristName: currentTouristName,
                       packageId: pack.id, packageName: pack.name, travelDate: date, persons: persons,
                       total: pack.price * persons, pickup: pickup, status: "Pending", payment: "Unpaid",
                       guideId: "", tourStatus: "", customRoute: [], bookedOn: todayString() };
    bookings.push(newBooking);
    console.log("New booking:", newBooking);
    showMessage("bookingMessage", "Booking " + newBooking.id + " for <strong>" + pack.name +
                "</strong> was sent. You can pay after the agency approves it.", "success");
  } else {
    // UPDATE
    let booking = bookings[editBookingIndex];
    booking.packageId = pack.id;
    booking.packageName = pack.name;
    booking.travelDate = date;
    booking.persons = persons;
    booking.total = pack.price * persons;
    booking.pickup = pickup;
    showMessage("bookingMessage", "Booking " + booking.id + " was updated.", "success");
  }

  resetBookingForm();
  refreshAll();
  return false;
}


// UPDATE step 1: copy the booking into the form
function editBooking(index) {
  let booking = bookings[index];
  editBookingIndex = index;

  document.getElementById("bookingPackage").value = booking.packageId;
  document.getElementById("bookingDate").value = booking.travelDate;
  document.getElementById("bookingPersons").value = booking.persons;
  setRadioValue("pickup", booking.pickup);
  updateBookingTotal();

  document.getElementById("bookingFormTitle").innerHTML = "Edit Booking " + booking.id;
  document.getElementById("bookingSaveButton").value = "Update Booking";
  hideMessage("bookingMessage");
}


// DELETE (cancel a pending booking)
function deleteBooking(index) {
  let booking = bookings[index];
  if (confirm("Cancel booking " + booking.id + "?") === false) {
    return;
  }
  bookings = removeAt(bookings, index);
  showMessage("bookingMessage", "Booking " + booking.id + " for <strong>" + booking.packageName + "</strong> was cancelled.", "info");
  resetBookingForm();
  refreshAll();
}


function resetBookingForm() {
  editBookingIndex = -1;
  document.getElementById("bookingForm").reset();
  clearErrors(bookingFields);
  document.getElementById("bookingFormTitle").innerHTML = "Book a Tour";
  document.getElementById("bookingSaveButton").value = "Book Now";
  document.getElementById("bookingTotal").innerHTML = "Choose a package to see the price.";
}


// Shows route, guide, vehicle and the guide's notices of one booking
function showBookingDetails(index) {
  let booking = bookings[index];
  let html = "<p><strong>" + booking.id + " - " + booking.packageName + "</strong> (" +
             booking.travelDate + " to " + getEndDate(booking) + ")</p>";

  html += "<p><strong>Route:</strong> ";
  if (booking.customRoute.length > 0) {
    html += "<span class='badge orange'>Changed by guide</span> ";
  }
  html += showRoute(getBookingRoute(booking)) + "</p>";

  if (booking.guideId === "") {
    html += "<p><strong>Guide:</strong> <span class='hint'>Not assigned yet</span></p>";
  } else {
    let guide = findById(users, booking.guideId);
    html += "<p><strong>Guide:</strong> " + guide.name + " (" + guide.phone + ") &middot; Tour status: " +
            statusBadge(booking.tourStatus) + "</p>";
  }

  let vehicle = getVehicleForBooking(booking.id);
  if (vehicle === null) {
    html += "<p><strong>Vehicle:</strong> <span class='hint'>Not booked yet</span></p>";
  } else {
    html += "<p><strong>Vehicle:</strong> " + vehicle.type + " " + vehicle.number + " &middot; Driver " +
            vehicle.driver + " (" + vehicle.driverPhone + ")</p>";
  }

  // Notices the guide posted for this booking
  let noticeHtml = "";
  for (let i = 0; i < notices.length; i++) {
    let notice = notices[i];
    if (notice.bookingId === booking.id) {
      noticeHtml += "<div class='log-item'><span class='log-time'>" + notice.date + "</span><br>" + notice.text + "</div>";
    }
  }
  if (noticeHtml !== "") {
    html += "<p><strong>Notices from your guide:</strong></p>" + noticeHtml;
  }

  document.getElementById("bookingDetails").innerHTML = html;
}


/* =====================================================================
   UNIQUE FEATURE 1: PAYMENT SYSTEM
   Only approved and unpaid bookings can be paid.
   The method (radio buttons) decides which fieldset is shown.
   ===================================================================== */
function renderPaymentOptions() {
  let count = fillBookingSelect("payBooking", function (booking) {
    return booking.status === "Approved" && booking.payment === "Unpaid";
  });
  if (count === 0) {
    document.getElementById("payPreview").innerHTML = "You have nothing to pay right now.";
  }
}

function goToPayment(bookingId) {
  showSection("paymentSection");
  document.getElementById("payBooking").value = bookingId;
  previewPayment();
}

function previewPayment() {
  let bookingId = document.getElementById("payBooking").value;
  let box = document.getElementById("payPreview");

  if (bookingId === "") {
    box.innerHTML = "Choose a booking to see the amount.";
    document.getElementById("payButton").value = "Pay";
    return;
  }

  let booking = findById(bookings, bookingId);
  box.innerHTML = "<p><strong>" + booking.packageName + "</strong> &middot; " + booking.travelDate + "</p>" +
                  "<p>" + booking.persons + " person(s), amount to pay: <span class='big'>" + formatTk(booking.total) + "</span></p>";
  document.getElementById("payButton").value = "Pay " + formatTk(booking.total);
}

// Show the wallet fields for bKash / Nagad, the card fields for Card
function showPaymentFields() {
  let method = getRadioValue("payMethod");
  let walletBox = document.getElementById("walletFields");
  let cardBox = document.getElementById("cardFields");

  switch (method) {
    case "bKash":
    case "Nagad":
      walletBox.style.display = "block";
      cardBox.style.display = "none";
      document.getElementById("walletLegend").innerHTML = method + " account";
      break;
    case "Card":
      walletBox.style.display = "none";
      cardBox.style.display = "block";
      break;
    default:
      walletBox.style.display = "none";
      cardBox.style.display = "none";
  }
  clearErrors(paymentFields);
}

// A transaction id like BK100007: prefix + a number that grows with every payment
// (same idea as nextId() in common.js, so no random numbers are needed)
function makeTransactionId(prefix) {
  return prefix + (100000 + payments.length + 1);
}

function makePayment() {
  let bookingId = document.getElementById("payBooking").value;
  let method = getRadioValue("payMethod");
  let isValid = true;
  let account = "";

  clearErrors(paymentFields);
  hideMessage("paymentMessage");

  if (bookingId === "") {
    showError("payBooking", "Please choose a booking.");
    isValid = false;
  }

  if (method === "") {
    showError("payMethod", "Choose bKash, Nagad or Card.");
    isValid = false;
  } else if (method === "Card") {
    let typedNumber = document.getElementById("cardNumber").value;
    let cardNumber = "";
    for (let i = 0; i < typedNumber.length; i++) {      // remove spaces
      if (typedNumber[i] !== " ") {
        cardNumber += typedNumber[i];
      }
    }
    let expiry = document.getElementById("cardExpiry").value.trim();
    let cvv = document.getElementById("cardCvv").value.trim();

    if (isDigitsOnly(cardNumber) === false || cardNumber.length !== 16) {
      showError("cardNumber", "Card number must be 16 digits.");
      isValid = false;
    }

    // MM/YY: 2 digits, a slash, 2 digits, month 01 to 12, not in the past
    let month = Number(expiry.slice(0, 2));
    let year = 2000 + Number(expiry.slice(3));
    let today = todayString();
    let thisYear = Number(today.slice(0, 4));
    let thisMonth = Number(today.slice(5, 7));

    if (expiry.length !== 5 || expiry[2] !== "/" || isDigitsOnly(expiry.slice(0, 2)) === false ||
        isDigitsOnly(expiry.slice(3)) === false || month < 1 || month > 12) {
      showError("cardExpiry", "Write the expiry date like 08/28.");
      isValid = false;
    } else if (year < thisYear || (year === thisYear && month < thisMonth)) {
      showError("cardExpiry", "This card has expired.");
      isValid = false;
    }

    if (isDigitsOnly(cvv) === false || cvv.length !== 3) {
      showError("cardCvv", "CVV must be 3 digits.");
      isValid = false;
    }

    // Never keep the full card number, only the last 4 digits
    account = "**** **** **** " + cardNumber.slice(12);
  } else {
    let walletNumber = document.getElementById("walletNumber").value.trim();
    let pin = document.getElementById("walletPin").value.trim();

    if (isDigitsOnly(walletNumber) === false || walletNumber.length !== 11 || walletNumber.slice(0, 2) !== "01") {
      showError("walletNumber", method + " number must be 11 digits and start with 01.");
      isValid = false;
    }
    if (isDigitsOnly(pin) === false || pin.length < 4 || pin.length > 5) {
      showError("walletPin", "PIN must be 4 or 5 digits.");
      isValid = false;
    }
    account = walletNumber;
  }

  if (isValid === false) {
    return false;
  }

  // Save the payment and mark the booking as paid
  let booking = findById(bookings, bookingId);
  let prefix = "CRD";
  if (method === "bKash") {
    prefix = "BK";
  } else if (method === "Nagad") {
    prefix = "NG";
  }
  let payment = { id: nextId("PAY", payments), bookingId: booking.id, touristId: currentTouristId, amount: booking.total,
                  method: method, account: account, trxId: makeTransactionId(prefix), date: todayString() };
  payments.push(payment);
  booking.payment = "Paid";
  console.log("Payment:", payment);

  showMessage("paymentMessage", "Payment of <strong>" + formatTk(payment.amount) + "</strong> was successful.", "success");

  // A small receipt below the form
  document.getElementById("receiptBox").innerHTML =
    "<div class='receipt'>" +
      "<h4>Payment Receipt</h4>" +
      "<p>Receipt no: " + payment.id + "<br>" +
      "Transaction id: <strong>" + payment.trxId + "</strong><br>" +
      "Booking: " + booking.id + " - " + booking.packageName + "<br>" +
      "Paid by: " + currentTouristName + " with " + method + " (" + account + ")<br>" +
      "Amount: <strong>" + formatTk(payment.amount) + "</strong><br>" +
      "Date: " + payment.date + "</p>" +
      "<button type='button' class='btn btn-small' onclick='window.print()'>Print</button>" +
    "</div>";

  document.getElementById("paymentForm").reset();
  showPaymentFields();
  document.getElementById("payPreview").innerHTML = "Choose a booking to see the amount.";
  document.getElementById("payButton").value = "Pay";
  refreshAll();
  return false;
}

function renderPayments() {
  let rows = "";
  let total = 0;

  for (let i = 0; i < payments.length; i++) {
    let payment = payments[i];
    if (payment.touristId === currentTouristId) {
      rows += "<tr><td>" + payment.trxId + "</td><td>" + payment.bookingId + "</td><td>" + payment.method +
              "</td><td>" + formatTk(payment.amount) + "</td><td>" + payment.date + "</td></tr>";
      total += payment.amount;
    }
  }

  if (rows === "") {
    rows = "<tr><td colspan='5' class='empty-row'>No payments yet.</td></tr>";
  }
  document.getElementById("paymentTableBody").innerHTML = rows;
  document.getElementById("paidTotal").innerHTML = "Total paid: " + formatTk(total);
}


/* =====================================================================
   UNIQUE FEATURE 2: REVIEWS AND RATINGS
   A completed tour that has no review yet can be rated once.
   ===================================================================== */
function renderReviewOptions() {
  fillBookingSelect("reviewBooking", function (booking) {
    return booking.status === "Completed" && hasReview(booking.id) === false;
  });
  showReviewGuide();
}

function goToReview(bookingId) {
  showSection("reviewsSection");
  document.getElementById("reviewBooking").value = bookingId;
  showReviewGuide();
}

// The guide rating row is shown only when the tour had a guide
function showReviewGuide() {
  let bookingId = document.getElementById("reviewBooking").value;
  let row = document.getElementById("guideRatingRow");

  if (bookingId === "") {
    row.style.display = "none";
    return;
  }
  let booking = findById(bookings, bookingId);
  if (booking.guideId === "") {
    row.style.display = "none";
  } else {
    row.style.display = "";
    document.getElementById("reviewGuideName").innerHTML = getUserName(booking.guideId);
  }
}

function saveReview() {
  let bookingId = document.getElementById("reviewBooking").value;
  let tourRating = getRadioValue("tourRating");
  let guideRating = getRadioValue("guideRating");
  let comment = document.getElementById("reviewComment").value.trim();

  let isValid = true;
  clearErrors(reviewFields);
  hideMessage("reviewMessage");

  if (bookingId === "") {
    showError("reviewBooking", "Choose a completed tour.");
    isValid = false;
  }

  if (tourRating === "") {
    showError("tourRating", "Give the tour 1 to 5 stars.");
    isValid = false;
  }

  let booking = null;
  if (bookingId !== "") {
    booking = findById(bookings, bookingId);
    if (booking.guideId !== "" && guideRating === "") {
      showError("guideRating", "Please rate your guide too.");
      isValid = false;
    }
  }

  if (comment.length < 10) {
    showError("reviewComment", "Please write at least 10 characters.");
    isValid = false;
  } else if (comment.length > 300) {
    showError("reviewComment", "Please keep it under 300 characters.");
    isValid = false;
  }

  if (isValid === false) {
    return false;
  }

  let review = { id: nextId("RV", reviews), bookingId: booking.id, packageId: booking.packageId,
                 touristId: currentTouristId, touristName: currentTouristName, rating: Number(tourRating),
                 guideId: booking.guideId, guideRating: Number(guideRating), comment: comment, date: todayString() };
  reviews.push(review);
  console.log("Review:", review);

  showMessage("reviewMessage", "Thank you! Your review of <strong>" + booking.packageName + "</strong> was saved.", "success");
  document.getElementById("reviewForm").reset();
  countCommentCharacters();
  refreshAll();
  return false;
}

function renderMyReviews() {
  let rows = "";

  for (let i = 0; i < reviews.length; i++) {
    let review = reviews[i];
    if (review.touristId === currentTouristId) {
      let pack = findById(packages, review.packageId);
      let guideText = "-";
      if (review.guideId !== "") {
        guideText = getUserName(review.guideId) + "<br>" + showStars(review.guideRating);
      }
      rows += "<tr>" +
                "<td><strong>" + pack.name + "</strong><br><span class='hint'>" + review.bookingId + "</span></td>" +
                "<td>" + showStars(review.rating) + "</td>" +
                "<td>" + guideText + "</td>" +
                "<td>" + review.comment + "</td>" +
                "<td>" + review.date + "</td>" +
                "<td><button type='button' class='btn btn-small btn-danger' onclick='deleteReview(" + i + ")'>Delete</button></td>" +
              "</tr>";
    }
  }

  if (rows === "") {
    rows = "<tr><td colspan='6' class='empty-row'>You have not written any reviews yet.</td></tr>";
  }
  document.getElementById("reviewTableBody").innerHTML = rows;
}

function deleteReview(index) {
  if (confirm("Delete this review?") === false) {
    return;
  }
  reviews = removeAt(reviews, index);
  showMessage("reviewMessage", "Your review was deleted. You can rate that tour again.", "info");
  refreshAll();
}

function countCommentCharacters() {
  let length = document.getElementById("reviewComment").value.length;
  let counter = document.getElementById("commentCounter");
  counter.innerHTML = length + " / 300";
  if (length > 300) {
    counter.style.color = "#C62828";
  } else {
    counter.style.color = "";
  }
}


/* =====================================================================
   UNIQUE FEATURE 3: SPECIAL REQUEST
   Create, read, update and remove requests. Only pending ones can change.
   ===================================================================== */
function renderRequestOptions() {
  fillBookingSelect("requestBooking", function (booking) {
    return booking.status === "Pending" || booking.status === "Approved";
  });
}

function renderRequests() {
  let keyword = document.getElementById("requestSearch").value;
  let statusFilter = document.getElementById("requestStatusFilter").value;
  let rows = "";

  for (let i = 0; i < specialRequests.length; i++) {
    let request = specialRequests[i];
    let matchesKeyword = containsText(request.details, keyword) || containsText(request.id, keyword) ||
                         containsText(request.type, keyword);
    let matchesStatus = (statusFilter === "All" || request.status === statusFilter);

    if (request.touristId === currentTouristId && matchesKeyword && matchesStatus) {
      let actions = "&mdash;";
      if (request.status === "Pending") {
        actions = "<button type='button' class='btn btn-small' onclick='editRequest(" + i + ")'>Edit</button>" +
                  "<button type='button' class='btn btn-small btn-danger' onclick='deleteRequest(" + i + ")'>Remove</button>";
      }
      let reply = "<span class='hint'>No reply yet</span>";
      if (request.reply !== "") {
        reply = request.reply;
      }

      rows += "<tr>" +
                "<td>" + request.id + "</td>" +
                "<td>" + request.bookingId + "</td>" +
                "<td>" + request.type + "</td>" +
                "<td>" + request.details + "</td>" +
                "<td>" + statusBadge(request.status) + "</td>" +
                "<td>" + reply + "</td>" +
                "<td>" + actions + "</td>" +
              "</tr>";
    }
  }

  if (rows === "") {
    rows = "<tr><td colspan='7' class='empty-row'>No requests match your search.</td></tr>";
  }
  document.getElementById("requestTableBody").innerHTML = rows;
}

function saveRequest() {
  let bookingId = document.getElementById("requestBooking").value;
  let type = document.getElementById("requestType").value;
  let details = document.getElementById("requestDetails").value.trim();

  let isValid = true;
  clearErrors(requestFields);
  hideMessage("requestMessage");

  if (bookingId === "") {
    showError("requestBooking", "Choose one of your upcoming bookings.");
    isValid = false;
  }
  if (type === "") {
    showError("requestType", "Choose a request type.");
    isValid = false;
  }
  if (details.length < 10) {
    showError("requestDetails", "Please write at least 10 characters.");
    isValid = false;
  } else if (details.length > 200) {
    showError("requestDetails", "Please keep it under 200 characters.");
    isValid = false;
  }

  if (isValid === false) {
    return false;
  }

  if (editRequestIndex === -1) {
    let request = { id: nextId("SR", specialRequests), bookingId: bookingId, touristId: currentTouristId,
                    touristName: currentTouristName, type: type, details: details, status: "Pending", reply: "", date: todayString() };
    specialRequests.push(request);
    showMessage("requestMessage", "Request " + request.id + " was sent to the agency.", "success");
  } else {
    let request = specialRequests[editRequestIndex];
    request.bookingId = bookingId;
    request.type = type;
    request.details = details;
    showMessage("requestMessage", "Request " + request.id + " was updated.", "success");
  }

  resetRequestForm();
  renderRequests();
  return false;
}

function editRequest(index) {
  let request = specialRequests[index];
  editRequestIndex = index;
  document.getElementById("requestBooking").value = request.bookingId;
  document.getElementById("requestType").value = request.type;
  document.getElementById("requestDetails").value = request.details;
  countRequestCharacters();
  document.getElementById("requestFormTitle").innerHTML = "Edit Request " + request.id;
  document.getElementById("requestSaveButton").value = "Update Request";
}

function deleteRequest(index) {
  let request = specialRequests[index];
  specialRequests = removeAt(specialRequests, index);
  showMessage("requestMessage", "Request " + request.id + " was removed.", "info");
  resetRequestForm();
  renderRequests();
}

function resetRequestForm() {
  editRequestIndex = -1;
  document.getElementById("requestForm").reset();
  clearErrors(requestFields);
  countRequestCharacters();
  document.getElementById("requestFormTitle").innerHTML = "New Request";
  document.getElementById("requestSaveButton").value = "Send Request";
}

function countRequestCharacters() {
  let length = document.getElementById("requestDetails").value.length;
  let counter = document.getElementById("requestCounter");
  counter.innerHTML = length + " / 200";
  if (length > 200) {
    counter.style.color = "#C62828";
  } else {
    counter.style.color = "";
  }
}

// A different example text for every request type (switch)
function showRequestHint() {
  let box = document.getElementById("requestDetails");
  switch (document.getElementById("requestType").value) {
    case "Food":
      box.placeholder = "e.g. 2 vegetarian meals, no beef, a kids menu...";
      break;
    case "Room":
      box.placeholder = "e.g. sea facing room, ground floor, an extra bed...";
      break;
    case "Pickup":
      box.placeholder = "e.g. pick us up from the airport at 10 AM...";
      break;
    case "Medical":
      box.placeholder = "e.g. a wheelchair for my father, help for an elderly member...";
      break;
    default:
      box.placeholder = "Tell the agency what you need...";
  }
}


/* =====================================================================
   START
   ===================================================================== */

// Redraws every part of the page that depends on the bookings
function refreshAll() {
  renderBookings();
  renderPaymentOptions();
  renderPayments();
  renderReviewOptions();
  renderMyReviews();
  renderRequestOptions();
  renderRequests();
}

loadPackageOptions();
refreshAll();
renderCatalog();
showSection("bookingsSection");
