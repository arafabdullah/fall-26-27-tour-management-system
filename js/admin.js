/* =====================================================================
   admin.js  -  Everything the System Admin can do (admin.html)
   ---------------------------------------------------------------------
   CRUD + Search : Manage Users (users array)
   Unique 1      : Action by Rating (warn / block guides, disable packages)
   Unique 2      : See Revenue (by month, method and package)
   Unique 3      : System Analytics & Reports

   The forms on this page never go to another page: each onsubmit
   handler does its work with JavaScript and returns false.
   ===================================================================== */

// The ids of the sections on this page (used by showSection in common.js)
const sections = ["reportSection", "usersSection", "ratingSection", "revenueSection"];

// -1 means "adding a new user"; any other number is the index being edited
let editUserIndex = -1;


/* =====================================================================
   SHARED: write an entry into the action log
   ===================================================================== */
function addLog(type, targetId, action, note) {
  actionLog.push({ time: nowString(), type: type, targetId: targetId, target: getTargetName(type, targetId),
                   action: action, note: note });
}

function getTargetName(type, targetId) {
  if (type === "Package") {
    let pack = findById(packages, targetId);
    if (pack === null) {
      return targetId;
    }
    return pack.name;
  }
  if (type === "Guide") {
    return getUserName(targetId);
  }
  if (type === "User") {
    return "";
  }
  return targetId;
}

// Draws simple horizontal bars. names[i] is the label of the bar with value counts[i].
// Each bar's width is set as a percentage with an inline style.
// Pass "Tk" as the last value to show the numbers as money.
function drawBarChart(chartId, names, counts, total, unit) {
  let html = "";

  for (let i = 0; i < names.length; i++) {
    let percent = 0;
    if (total > 0) {
      percent = Math.round(counts[i] / total * 100);
    }
    let valueText = counts[i];
    if (unit === "Tk") {
      valueText = formatTk(counts[i]);
    }
    html += "<div class='bar-row'>" +
              "<div class='bar-label'>" + names[i] + "</div>" +
              "<div class='bar-track'><div class='bar-fill' style='width:" + percent + "%'></div></div>" +
              "<div class='bar-value'>" + valueText + "</div>" +
            "</div>";
  }

  document.getElementById(chartId).innerHTML = html;
}


/* =====================================================================
   UNIQUE FEATURE 3: SYSTEM ANALYTICS & REPORTS
   ===================================================================== */
function generateReport() {
  // ----- Users -----
  let pendingUsers = 0;
  let roleCounts = { "Admin": 0, "Agency Manager": 0, "Tour Guide": 0, "Tourist": 0 };   // an object used as counters

  for (let i = 0; i < users.length; i++) {
    let user = users[i];
    if (user.status === "Pending") {
      pendingUsers++;
    }
    roleCounts[user.role]++;          // bracket notation: roleCounts["Tourist"]++
  }

  // ----- Bookings -----
  let statusCounts = { Pending: 0, Approved: 0, Completed: 0, Rejected: 0 };
  let tourCounts = { "Scheduled": 0, "In Progress": 0, "Delayed": 0, "Completed": 0 };
  let travellers = 0;

  // Two arrays that go together: categoryNames[i] has categoryTotals[i] bookings
  let categoryNames = [];
  let categoryTotals = [];

  for (let i = 0; i < bookings.length; i++) {
    let booking = bookings[i];
    statusCounts[booking.status]++;
    if (booking.tourStatus !== "") {
      tourCounts[booking.tourStatus]++;
    }
    if (booking.status === "Approved" || booking.status === "Completed") {
      travellers += booking.persons;
    }

    let pack = findById(packages, booking.packageId);
    let category = "Other";
    if (pack !== null) {
      category = pack.category;
    }
    let position = categoryNames.indexOf(category);   // -1 if not in the array yet
    if (position === -1) {
      categoryNames.push(category);
      categoryTotals.push(0);
      position = categoryNames.length - 1;
    }
    categoryTotals[position]++;
  }

  // ----- Show the numbers with innerHTML -----
  document.getElementById("statUsers").innerHTML = users.length;
  document.getElementById("statPendingUsers").innerHTML = pendingUsers;
  document.getElementById("statPackages").innerHTML = packages.length;
  document.getElementById("statBookings").innerHTML = bookings.length;
  document.getElementById("statTravellers").innerHTML = travellers;
  document.getElementById("statAvgRating").innerHTML = averageRating(reviews, "rating") + " / 5";
  document.getElementById("reportTime").innerHTML = "Generated at " + nowString();

  // Pending accounts are shown in orange when there are any (element.style)
  if (pendingUsers > 0) {
    document.getElementById("statPendingUsers").style.color = "#EF6C00";
  } else {
    document.getElementById("statPendingUsers").style.color = "";
  }

  // ----- Bar charts -----
  let roleNames = ["Admin", "Agency Manager", "Tour Guide", "Tourist"];
  let roleTotals = [roleCounts["Admin"], roleCounts["Agency Manager"], roleCounts["Tour Guide"], roleCounts["Tourist"]];
  drawBarChart("roleChart", roleNames, roleTotals, users.length);

  let statusNames = ["Pending", "Approved", "Completed", "Rejected"];
  let statusTotals = [statusCounts.Pending, statusCounts.Approved, statusCounts.Completed, statusCounts.Rejected];
  drawBarChart("bookingStatusChart", statusNames, statusTotals, bookings.length);

  let tourNames = ["Scheduled", "In Progress", "Delayed", "Completed"];
  let tourTotals = [tourCounts["Scheduled"], tourCounts["In Progress"], tourCounts["Delayed"], tourCounts["Completed"]];
  drawBarChart("tourStatusChart", tourNames, tourTotals, tourTotals[0] + tourTotals[1] + tourTotals[2] + tourTotals[3]);

  drawBarChart("categoryChart", categoryNames, categoryTotals, bookings.length);

  // ----- Package status breakdown table -----
  let rows = "";
  for (let i = 0; i < packages.length; i++) {
    let pack = packages[i];
    let count = { Pending: 0, Approved: 0, Completed: 0, Rejected: 0 };
    let revenue = 0;
    for (let j = 0; j < bookings.length; j++) {
      let booking = bookings[j];
      if (booking.packageId === pack.id) {
        count[booking.status]++;
      }
    }
    for (let j = 0; j < payments.length; j++) {
      let payment = payments[j];
      let booking = findById(bookings, payment.bookingId);
      if (booking !== null && booking.packageId === pack.id) {
        revenue += payment.amount;
      }
    }
    let packReviews = getPackageReviews(pack.id);
    let rating = "-";
    if (packReviews.length > 0) {
      rating = averageRating(packReviews, "rating");
    }

    rows += "<tr><td><strong>" + pack.name + "</strong></td><td>" + statusBadge(pack.status) + "</td><td>" + count.Pending +
            "</td><td>" + count.Approved + "</td><td>" + count.Completed + "</td><td>" + count.Rejected +
            "</td><td>" + rating + "</td><td>" + formatTk(revenue) + "</td></tr>";
  }
  document.getElementById("packageReportBody").innerHTML = rows;
}


/* =====================================================================
   MANAGE USERS: CREATE, READ, UPDATE, DELETE, SEARCH
   ===================================================================== */

// READ + SEARCH: draw the table rows with a loop and innerHTML (Lab 04, Task 2)
function renderUsers() {
  let keyword = document.getElementById("userSearch").value;
  let roleFilter = document.getElementById("userRoleFilter").value;
  let statusFilter = document.getElementById("userStatusFilter").value;

  let rows = "";
  let shown = 0;

  for (let i = 0; i < users.length; i++) {
    let user = users[i];

    // SEARCH: skip users that do not match the keyword or the filters
    let matchesKeyword = containsText(user.name, keyword) || containsText(user.username, keyword) ||
                         containsText(user.email, keyword) || containsText(user.id, keyword);
    let matchesRole = (roleFilter === "All" || user.role === roleFilter);
    let matchesStatus = (statusFilter === "All" || user.status === statusFilter);

    if (matchesKeyword && matchesRole && matchesStatus) {
      // A colour for each status, and an Approve button for pending accounts
      let statusColor;
      let approveButton = "";
      switch (user.status) {
        case "Active":
          statusColor = "green";
          break;
        case "Pending":
          statusColor = "orange";
          approveButton = "<button type='button' class='btn btn-small btn-success' onclick='approveUser(" + i + ")'>Approve</button>";
          break;
        default:
          statusColor = "red";
      }

      rows += "<tr>" +
                "<td>" + user.id + "</td>" +
                "<td><strong>" + user.name + "</strong><br><span class='hint'>" + user.email + "</span></td>" +
                "<td>" + user.username + "</td>" +
                "<td><span class='badge " + user.role.toLowerCase() + "'>" + user.role + "</span></td>" +
                "<td><span class='badge " + statusColor + "'>" + user.status + "</span></td>" +
                "<td>" +
                  approveButton +
                  "<button type='button' class='btn btn-small' onclick='editUser(" + i + ")'>Edit</button>" +
                  "<button type='button' class='btn btn-small btn-danger' onclick='deleteUser(" + i + ")'>Delete</button>" +
                "</td>" +
              "</tr>";
      shown++;
    }
  }

  if (shown === 0) {
    rows = "<tr><td colspan='6' class='empty-row'>No users match your search.</td></tr>";
  }

  document.getElementById("userTableBody").innerHTML = rows;
  document.getElementById("userCount").innerHTML = "Showing " + shown + " of " + users.length + " users";
}


// CREATE or UPDATE: runs when the user form is submitted
function saveUser() {
  let name = document.getElementById("userName").value.trim();
  let username = document.getElementById("userUsername").value.trim();
  let email = document.getElementById("userEmail").value.trim();
  let password = document.getElementById("userPassword").value;
  let role = document.getElementById("userRole").value;
  let status = getRadioValue("userStatus");

  // ----- Validation -----
  let isValid = true;
  clearErrors(["userName", "userUsername", "userEmail", "userPassword", "userRole"]);

  if (name.length < 3) {
    showError("userName", "Name must be at least 3 characters.");
    isValid = false;
  }

  if (username.length < 4) {
    showError("userUsername", "Username must be at least 4 characters.");
    isValid = false;
  } else if (usernameUsedByOther(username)) {
    showError("userUsername", "Another user already has this username.");
    isValid = false;
  }

  if (isValidEmail(email) === false) {
    showError("userEmail", "Please enter a valid email address.");
    isValid = false;
  }

  if (password.length < 8) {
    showError("userPassword", "Password must be at least 8 characters.");
    isValid = false;
  }

  if (role === "") {
    showError("userRole", "Please choose a role.");
    isValid = false;
  }

  if (isValid === false) {
    return false;
  }

  // ----- Save -----
  if (editUserIndex === -1) {
    // CREATE: build a new object and push() it to the end of the array
    let newUser = { id: nextId("U", users), name: name, username: username, email: email,
                    password: password, role: role, status: status };
    users.push(newUser);
    addLog("User", "-", "Account", "Created " + role.toLowerCase() + " account for " + name);
    showMessage("userMessage", "User <strong>" + name + "</strong> was added with id " + newUser.id + ".", "success");
  } else {
    // UPDATE: change the properties of the object that is being edited
    let user = users[editUserIndex];
    if (user.status !== status) {
      addLog("User", "-", "Account", status + " account of " + name);
    }
    user.name = name;
    user.username = username;
    user.email = email;
    user.password = password;
    user.role = role;
    user.status = status;
    addLog("User", "-", "Account", "Updated account " + user.id + " (" + name + ")");
    showMessage("userMessage", "User <strong>" + name + "</strong> was updated.", "success");
  }

  resetUserForm();
  renderUsers();
  return false;   // never leave the page
}


// true if the username belongs to a DIFFERENT user than the one being edited
function usernameUsedByOther(username) {
  for (let i = 0; i < users.length; i++) {
    if (i !== editUserIndex && users[i].username.toLowerCase() === username.toLowerCase()) {
      return true;
    }
  }
  return false;
}


// UPDATE step 1: copy the user's values into the form
function editUser(index) {
  let user = users[index];
  editUserIndex = index;

  document.getElementById("userName").value = user.name;
  document.getElementById("userUsername").value = user.username;
  document.getElementById("userEmail").value = user.email;
  document.getElementById("userPassword").value = user.password;
  document.getElementById("userRole").value = user.role;
  setRadioValue("userStatus", user.status);

  document.getElementById("userFormTitle").innerHTML = "Edit User " + user.id;
  document.getElementById("userSaveButton").value = "Update User";
  hideMessage("userMessage");
}


// DELETE: remove the user from the array
function deleteUser(index) {
  let user = users[index];

  // The admin who is logged in cannot delete their own account
  if (user.id === "U-001") {
    showMessage("userMessage", "You cannot delete your own admin account.", "error");
    return;
  }

  users = removeAt(users, index);
  addLog("User", "-", "Account", "Deleted account " + user.id + " (" + user.name + ")");
  showMessage("userMessage", "User <strong>" + user.name + "</strong> was deleted.", "info");

  resetUserForm();
  renderUsers();
}


// Approve a pending registration (e.g. a new guide or manager): status becomes Active
function approveUser(index) {
  let user = users[index];
  user.status = "Active";
  addLog("User", "-", "Account", "Approved " + user.role.toLowerCase() + " account of " + user.name);
  showMessage("userMessage", "<strong>" + user.name + "</strong> was approved and can now log in.", "success");
  renderUsers();
}


// Clears the form and goes back to "Add" mode
function resetUserForm() {
  editUserIndex = -1;
  document.getElementById("userForm").reset();
  clearErrors(["userName", "userUsername", "userEmail", "userPassword", "userRole"]);
  document.getElementById("userFormTitle").innerHTML = "Add New User";
  document.getElementById("userSaveButton").value = "Add User";
}


/* =====================================================================
   UNIQUE FEATURE 1: ACTION BY RATING
   ===================================================================== */

// Returns an array with the reviews of one package
function getPackageReviews(packageId) {
  let list = [];
  for (let i = 0; i < reviews.length; i++) {
    let review = reviews[i];
    if (review.packageId === packageId) {
      list.push(review);
    }
  }
  return list;
}

// Returns an array with the reviews that rated one guide
function getGuideReviews(guideId) {
  let list = [];
  for (let i = 0; i < reviews.length; i++) {
    let review = reviews[i];
    if (review.guideId === guideId && review.guideRating > 0) {
      list.push(review);
    }
  }
  return list;
}

function countWarnings(guideId) {
  let count = 0;
  for (let i = 0; i < actionLog.length; i++) {
    let entry = actionLog[i];
    if (entry.type === "Guide" && entry.targetId === guideId && entry.action === "Warning") {
      count++;
    }
  }
  return count;
}

function renderRatings() {
  let limit = Number(document.getElementById("ratingLimit").value);
  let onlyLow = document.getElementById("onlyLow").checked;

  // ----- Packages -----
  let rows = "";
  for (let i = 0; i < packages.length; i++) {
    let pack = packages[i];
    let packReviews = getPackageReviews(pack.id);
    let average = averageRating(packReviews, "rating");
    let isLow = packReviews.length > 0 && average < limit;

    if (onlyLow && isLow === false) {
      continue;
    }

    let action;
    if (pack.status === "Active") {
      action = "<input type='text' id='packNote-" + pack.id + "' class='inline-input' placeholder='Reason (optional)'> " +
               "<button type='button' class='btn btn-small btn-danger' onclick='setPackageStatus(" + i + ", \"Disabled\")'>Disable</button>";
    } else {
      action = "<button type='button' class='btn btn-small btn-success' onclick='setPackageStatus(" + i + ", \"Active\")'>Enable</button>";
    }

    let averageText = "<span class='hint'>No reviews</span>";
    if (packReviews.length > 0) {
      averageText = showStars(Math.round(average)) + " " + average;
    }

    let rowClass = "";
    if (isLow) {
      rowClass = " class='low-row'";
    }
    rows += "<tr" + rowClass + "><td>" + pack.id + "</td><td><strong>" + pack.name +
            "</strong></td><td>" + averageText + "</td><td>" + packReviews.length + "</td><td>" + statusBadge(pack.status) +
            "</td><td>" + action + "</td></tr>";
  }
  if (rows === "") {
    rows = "<tr><td colspan='6' class='empty-row'>No packages below the limit.</td></tr>";
  }
  document.getElementById("packageRatingBody").innerHTML = rows;

  // ----- Guides -----
  rows = "";
  for (let i = 0; i < users.length; i++) {
    let user = users[i];
    if (user.role !== "Tour Guide") {
      continue;
    }
    let guideReviews = getGuideReviews(user.id);
    let average = averageRating(guideReviews, "guideRating");
    let isLow = guideReviews.length > 0 && average < limit;

    if (onlyLow && isLow === false) {
      continue;
    }

    let blockButton;
    if (user.status === "Blocked") {
      blockButton = "<button type='button' class='btn btn-small btn-success' onclick='setGuideStatus(" + i + ", \"Active\")'>Unblock</button>";
    } else {
      blockButton = "<button type='button' class='btn btn-small btn-danger' onclick='setGuideStatus(" + i + ", \"Blocked\")'>Block</button>";
    }

    let averageText = "<span class='hint'>No ratings</span>";
    if (guideReviews.length > 0) {
      averageText = showStars(Math.round(average)) + " " + average;
    }
    let warnings = countWarnings(user.id);

    let rowClass = "";
    if (isLow) {
      rowClass = " class='low-row'";
    }
    let warningsText = "0";
    if (warnings > 0) {
      warningsText = "<span class='badge orange'>" + warnings + "</span>";
    }
    rows += "<tr" + rowClass + "><td>" + user.id + "</td><td><strong>" + user.name +
            "</strong></td><td>" + averageText + "</td><td>" + guideReviews.length + "</td><td>" +
            warningsText + "</td><td>" +
            statusBadge(user.status) + "</td><td>" +
            "<input type='text' id='warn-" + user.id + "' class='inline-input' placeholder='Warning message'> " +
            "<button type='button' class='btn btn-small' onclick='warnGuide(" + i + ")'>Warn</button>" +
            blockButton + "</td></tr>";
  }
  if (rows === "") {
    rows = "<tr><td colspan='7' class='empty-row'>No guides below the limit.</td></tr>";
  }
  document.getElementById("guideRatingBody").innerHTML = rows;

  // ----- Low reviews -----
  rows = "";
  for (let i = 0; i < reviews.length; i++) {
    let review = reviews[i];
    if (review.rating <= 2 || (review.guideRating > 0 && review.guideRating <= 2)) {
      let pack = findById(packages, review.packageId);
      let guideText = "-";
      if (review.guideId !== "") {
        guideText = getUserName(review.guideId) + " " + showStars(review.guideRating);
      }
      rows += "<tr><td>" + review.id + "</td><td>" + review.touristName + "</td><td>" + pack.name + "<br>" +
              showStars(review.rating) + "</td><td>" + guideText + "</td><td>" + review.comment + "</td><td>" +
              "<button type='button' class='btn btn-small btn-danger' onclick='removeReview(" + i + ")'>Remove</button></td></tr>";
    }
  }
  if (rows === "") {
    rows = "<tr><td colspan='6' class='empty-row'>No low reviews.</td></tr>";
  }
  document.getElementById("lowReviewBody").innerHTML = rows;

  renderActionLog();
}

function setPackageStatus(index, newStatus) {
  let pack = packages[index];
  let note = "Enabled again";

  if (newStatus === "Disabled") {
    note = document.getElementById("packNote-" + pack.id).value.trim();
    if (note === "") {
      note = "Low rating from tourists";
    }
    if (confirm("Disable " + pack.name + "? Tourists will not be able to book it.") === false) {
      return;
    }
  }

  pack.status = newStatus;
  let logAction = "Enabled";
  let msgType = "success";
  if (newStatus === "Disabled") {
    logAction = "Disabled";
    msgType = "info";
  }
  addLog("Package", pack.id, logAction, note);
  showMessage("ratingMessage", "<strong>" + pack.name + "</strong> is now " + newStatus + ".", msgType);
  renderAll();
}

function warnGuide(index) {
  let guide = users[index];
  let note = document.getElementById("warn-" + guide.id).value.trim();

  if (note.length < 5) {
    showMessage("ratingMessage", "Write a warning message for " + guide.name + " (at least 5 characters).", "error");
    return;
  }
  addLog("Guide", guide.id, "Warning", note);
  showMessage("ratingMessage", "A warning was sent to <strong>" + guide.name + "</strong>. It shows on the guide's dashboard.", "success");
  renderRatings();
}

function setGuideStatus(index, newStatus) {
  let guide = users[index];
  if (newStatus === "Blocked" && confirm("Block " + guide.name + "? The guide will not be able to log in.") === false) {
    return;
  }
  guide.status = newStatus;
  let logAction = "Unblocked";
  let logNote = "Account allowed again";
  if (newStatus === "Blocked") {
    logAction = "Blocked";
    logNote = "Blocked because of low ratings";
  }
  addLog("Guide", guide.id, logAction, logNote);
  showMessage("ratingMessage", "<strong>" + guide.name + "</strong> is now " + newStatus + ".", "info");
  renderAll();
}

// Only for fake or rude reviews
function removeReview(index) {
  let review = reviews[index];
  if (confirm("Remove review " + review.id + "? Do this only for fake or rude reviews.") === false) {
    return;
  }
  reviews = removeAt(reviews, index);
  addLog("Review", review.id, "Removed", "Review by " + review.touristName + " was removed");
  showMessage("ratingMessage", "Review " + review.id + " was removed.", "info");
  renderAll();
}

// Picks a colour for each type of action with a switch statement
function getLogColor(type) {
  let color;
  switch (type) {
    case "Guide":
      color = "#6A1B9A";
      break;
    case "Package":
      color = "#C62828";
      break;
    case "Review":
      color = "#EF6C00";
      break;
    case "User":
      color = "#1565C0";
      break;
    default:
      color = "#6C757D";
  }
  return color;
}

function renderActionLog() {
  let board = document.getElementById("actionBoard");
  board.innerHTML = "";

  // Loop backwards so the newest entry is at the top
  for (let i = actionLog.length - 1; i >= 0; i--) {
    let entry = actionLog[i];
    let item = document.createElement("div");
    item.className = "log-item";
    item.style.borderLeftColor = getLogColor(entry.type);
    let targetText = "";
    if (entry.target !== "") {
      targetText = entry.target + ": ";
    }
    item.innerHTML = "<span class='log-time'>" + entry.time + "</span><br>" +
                     "<span class='badge' style='background-color:" + getLogColor(entry.type) + "'>" + entry.type + "</span> " +
                     "<strong>" + entry.action + "</strong> " + targetText + entry.note;
    board.appendChild(item);
  }

  if (actionLog.length === 0) {
    board.innerHTML = "<p class='empty-row'>No actions yet.</p>";
  }
}


/* =====================================================================
   UNIQUE FEATURE 2: SEE REVENUE
   ===================================================================== */
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function renderRevenue() {
  let total = 0;
  let thisMonth = 0;
  let today = todayString();
  let currentMonth = today.slice(0, 7);          // "2026-11"

  for (let i = 0; i < payments.length; i++) {
    let payment = payments[i];
    total += payment.amount;
    if (payment.date.slice(0, 7) === currentMonth) {
      thisMonth += payment.amount;
    }
  }

  // Money still to come: approved bookings that are not paid yet
  let due = 0;
  for (let i = 0; i < bookings.length; i++) {
    let booking = bookings[i];
    if (booking.status === "Approved" && booking.payment === "Unpaid") {
      due += booking.total;
    }
  }

  let average = 0;
  if (payments.length > 0) {
    average = total / payments.length;
  }
  document.getElementById("revTotal").innerHTML = formatTk(total);
  document.getElementById("revMonth").innerHTML = formatTk(thisMonth);
  document.getElementById("revAverage").innerHTML = formatTk(average);
  document.getElementById("revDue").innerHTML = formatTk(due);

  // ----- Last 6 months: build the "YYYY-MM" keys going backwards from this month -----
  // Start 5 months back and move forward, so the oldest month comes first
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7)) - 5;
  if (month < 1) {
    month = month + 12;
    year--;
  }
  let monthKeys = [];
  let monthLabels = [];

  for (let i = 0; i < 6; i++) {
    let monthText = month;
    if (month < 10) {
      monthText = "0" + month;
    }
    let key = year + "-" + monthText;
    monthKeys.push(key);
    monthLabels.push(monthNames[month - 1] + " " + year);
    month++;
    if (month === 13) {
      month = 1;
      year++;
    }
  }

  let monthTotals = [];
  let biggest = 0;
  for (let i = 0; i < monthKeys.length; i++) {
    let key = monthKeys[i];
    let sum = 0;
    for (let j = 0; j < payments.length; j++) {
      let payment = payments[j];
      if (payment.date.slice(0, 7) === key) {
        sum += payment.amount;
      }
    }
    monthTotals.push(sum);
    if (sum > biggest) {
      biggest = sum;
    }
  }
  // The biggest month gets the full bar, the others are compared with it
  drawBarChart("monthChart", monthLabels, monthTotals, biggest, "Tk");

  // ----- By payment method -----
  let methods = ["bKash", "Nagad", "Card"];
  let methodTotals = [0, 0, 0];
  for (let i = 0; i < payments.length; i++) {
    let payment = payments[i];
    let position = methods.indexOf(payment.method);
    methodTotals[position] += payment.amount;
  }
  drawBarChart("methodChart", methods, methodTotals, total, "Tk");

  // ----- By package -----
  let packNames = [];
  let packTotals = [];
  for (let i = 0; i < packages.length; i++) {
    let pack = packages[i];
    let sum = 0;
    for (let j = 0; j < payments.length; j++) {
      let payment = payments[j];
      let booking = findById(bookings, payment.bookingId);
      if (booking !== null && booking.packageId === pack.id) {
        sum += payment.amount;
      }
    }
    packNames.push(pack.name);
    packTotals.push(sum);
  }
  drawBarChart("packageRevenueChart", packNames, packTotals, total, "Tk");

  renderPaymentList();
}

// READ + SEARCH over all payments, with a date range
function renderPaymentList() {
  let keyword = document.getElementById("paymentSearch").value;
  let from = document.getElementById("paymentFrom").value;
  let to = document.getElementById("paymentTo").value;
  let methodFilter = document.getElementById("paymentMethodFilter").value;

  let rows = "";
  let shown = 0;
  let sum = 0;

  // Newest first
  for (let i = payments.length - 1; i >= 0; i--) {
    let payment = payments[i];
    let touristName = getUserName(payment.touristId);

    let matchesKeyword = containsText(touristName, keyword) || containsText(payment.bookingId, keyword) ||
                         containsText(payment.trxId, keyword);
    let matchesFrom = (from === "" || payment.date >= from);
    let matchesTo = (to === "" || payment.date <= to);
    let matchesMethod = (methodFilter === "All" || payment.method === methodFilter);

    if (matchesKeyword && matchesFrom && matchesTo && matchesMethod) {
      rows += "<tr><td>" + payment.id + "</td><td>" + payment.trxId + "</td><td>" + touristName + "</td><td>" +
              payment.bookingId + "</td><td>" + payment.method + "</td><td>" + formatTk(payment.amount) + "</td><td>" +
              payment.date + "</td></tr>";
      shown++;
      sum += payment.amount;
    }
  }

  if (shown === 0) {
    rows = "<tr><td colspan='7' class='empty-row'>No payments match your search.</td></tr>";
  }
  document.getElementById("paymentListBody").innerHTML = rows;
  document.getElementById("paymentCount").innerHTML = shown + " payment(s), total " + formatTk(sum);
}


/* =====================================================================
   START: runs once when the page has loaded (scripts are at the end of <body>)
   ===================================================================== */
function renderAll() {
  generateReport();
  renderUsers();
  renderRatings();
  renderRevenue();
}

renderAll();
showSection("reportSection");

// Each time the admin opens the report, show fresh data
document.getElementById("nav-reportSection").addEventListener("click", generateReport);

// Show the name of the user who logged in (the top bar)
let loggedInUser = getLoggedInUser();
if (loggedInUser !== null) {
  showWelcomeName(loggedInUser.id);
}
