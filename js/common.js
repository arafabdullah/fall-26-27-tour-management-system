/* =====================================================================
   common.js  -  Helper functions shared by every page
   ---------------------------------------------------------------------
   Loaded after data.js and before each page's own script:
     <script src="js/data.js"></script>
     <script src="js/common.js"></script>
     <script src="js/tourist.js"></script>
   An external .js file contains only JavaScript, no <script> tags.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. SHOW ONE SECTION AT A TIME
   Each dashboard page declares an array called "sections" with the ids
   of its sections. Clicking a menu button calls showSection("id").
   We change the CSS with the DOM:  element.style.display = "block"
   --------------------------------------------------------------------- */
function showSection(sectionId) {
  for (let i = 0; i < sections.length; i++) {
    let section = document.getElementById(sections[i]);
    let navButton = document.getElementById("nav-" + sections[i]);

    if (sections[i] === sectionId) {
      section.style.display = "block";
      navButton.className = "active";
    } else {
      section.style.display = "none";
      navButton.className = "";
    }
  }
}


/* ---------------------------------------------------------------------
   2. SHOWING AND CLEARING ERRORS
   Every field has a <span class="error" id="fieldIdError"></span>
   next to it. We write the message with innerHTML and colour the
   field's border red with element.style (Lab 04, Task 1).
   --------------------------------------------------------------------- */
function showError(fieldId, message) {
  document.getElementById(fieldId + "Error").innerHTML = message;

  // Radio-button groups have no single element with this id, so check first
  let field = document.getElementById(fieldId);
  if (field != null) {
    field.style.border = "2px solid red";
  }
}

function clearError(fieldId) {
  document.getElementById(fieldId + "Error").innerHTML = "";

  let field = document.getElementById(fieldId);
  if (field != null) {
    field.style.border = "";   // "" gives the border back to the CSS file
  }
}

// Clears the errors of many fields at once; fieldIds is an array
function clearErrors(fieldIds) {
  for (let i = 0; i < fieldIds.length; i++) {
    clearError(fieldIds[i]);
  }
}


/* ---------------------------------------------------------------------
   3. MESSAGE BOXES
   type is "success", "error" or "info" (these are CSS classes)
   --------------------------------------------------------------------- */
function showMessage(boxId, text, type) {
  let box = document.getElementById(boxId);
  box.innerHTML = text;
  box.className = "message " + type;
  box.style.display = "block";
}

function hideMessage(boxId) {
  document.getElementById(boxId).style.display = "none";
}


/* ---------------------------------------------------------------------
   4. SMALL VALIDATION HELPERS
   Each returns true or false, so they can be used inside if ( ... )
   --------------------------------------------------------------------- */

// true when the user typed nothing (or only spaces)
function isEmpty(value) {
  return value.trim() === "";
}

// A simple e-mail check: something@something.something
function isValidEmail(email) {
  let atPosition = email.indexOf("@");
  let dotPosition = email.indexOf(".", atPosition);

  if (atPosition < 1) {
    return false;                       // no @, or @ is the first character
  }
  if (dotPosition < atPosition + 2) {
    return false;                       // no dot after the @
  }
  if (dotPosition === email.length - 1) {
    return false;                       // the dot is the last character
  }
  return true;
}

// true when every character of text is a digit 0-9
function isDigitsOnly(text) {
  if (text.length === 0) {
    return false;
  }
  let digits = "0123456789";
  for (let i = 0; i < text.length; i++) {
    if (digits.indexOf(text[i]) === -1) {
      return false;
    }
  }
  return true;
}

// Returns the value of the ticked radio button in a group, or "" if none
// (Lecture 01: document.getElementsByName("Gender"))
function getRadioValue(groupName) {
  let radios = document.getElementsByName(groupName);
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      return radios[i].value;
    }
  }
  return "";
}

// Ticks the radio button whose value matches (used when editing a record)
function setRadioValue(groupName, value) {
  let radios = document.getElementsByName(groupName);
  for (let i = 0; i < radios.length; i++) {
    radios[i].checked = (radios[i].value === value);
  }
}


/* ---------------------------------------------------------------------
   5. SEARCH HELPER
   true when "text" contains "keyword", ignoring upper/lower case.
   Uses the string methods toLowerCase() and indexOf() from Lecture 03.
   --------------------------------------------------------------------- */
function containsText(text, keyword) {
  return String(text).toLowerCase().indexOf(keyword.toLowerCase()) !== -1;
}


/* ---------------------------------------------------------------------
   6. ARRAY HELPERS
   --------------------------------------------------------------------- */

// Finds the position (index) of the object whose id matches, or -1
function findIndexById(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return i;
    }
  }
  return -1;
}

// Returns a NEW array without the element at "index".
// slice() copies part of an array and concat() joins two arrays (Lecture 05).
function removeAt(list, index) {
  return list.slice(0, index).concat(list.slice(index + 1));
}

// Makes the next id, e.g. nextId("P", packages) gives "P-106"
// and nextId("U", users) gives "U-011" (same number of digits as the others).
// It looks for the biggest number already used and adds 1.
function nextId(prefix, list) {
  let biggest = 0;
  let digits = 3;
  for (let i = 0; i < list.length; i++) {
    let numberText = list[i].id.slice(prefix.length + 1);   // "U-007" -> "007"
    digits = numberText.length;
    if (Number(numberText) > biggest) {
      biggest = Number(numberText);
    }
  }

  // Add zeros at the front until the number has enough digits: 8 -> "008"
  let newNumber = String(biggest + 1);
  while (newNumber.length < digits) {
    newNumber = "0" + newNumber;
  }
  return prefix + "-" + newNumber;
}


/* ---------------------------------------------------------------------
   7. DATE HELPERS
   Dates are kept as text "YYYY-MM-DD", like <input type="date"> gives.
   Date is a built-in JavaScript object; here we only use it to count days.
   --------------------------------------------------------------------- */

// Today's date as "YYYY-MM-DD"
function todayString() {
  let now = new Date();
  let month = now.getMonth() + 1;          // months count from 0
  let day = now.getDate();
  if (month < 10) { month = "0" + month; }
  if (day < 10) { day = "0" + day; }
  return now.getFullYear() + "-" + month + "-" + day;
}

// Adds "days" to a date text and returns the new date text
function addDays(dateText, days) {
  let date = new Date(dateText + "T00:00");   // T00:00 = midnight, local time
  date.setDate(date.getDate() + days);
  let month = date.getMonth() + 1;
  let day = date.getDate();
  if (month < 10) { month = "0" + month; }
  if (day < 10) { day = "0" + day; }
  return date.getFullYear() + "-" + month + "-" + day;
}

// Number of days from firstDate to secondDate (negative if secondDate is earlier)
function daysBetween(firstDate, secondDate) {
  let oneDay = 1000 * 60 * 60 * 24;          // milliseconds in one day
  let difference = new Date(secondDate + "T00:00") - new Date(firstDate + "T00:00");
  return Math.round(difference / oneDay);
}

// The current date and time as "YYYY-MM-DD HH:MM" (for the action log)
function nowString() {
  let now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  if (hours < 10) { hours = "0" + hours; }
  if (minutes < 10) { minutes = "0" + minutes; }
  return todayString() + " " + hours + ":" + minutes;
}


/* ---------------------------------------------------------------------
   8. SMALL HELPERS FOR TOURS
   --------------------------------------------------------------------- */

// Returns the OBJECT whose id matches (not the index), or null
function findById(list, id) {
  let index = findIndexById(list, id);
  if (index === -1) {
    return null;
  }
  return list[index];
}

// Finds the user who just logged in. The login form sends "?username=..." in the
// address bar (later this will come from $_SESSION). Returns the user, or null.
function getLoggedInUser() {
  let query = window.location.search;            // e.g. "?username=guide"
  let start = query.indexOf("username=");
  if (start === -1) {
    return null;
  }
  let typed = query.slice(start + 9);
  let end = typed.indexOf("&");
  if (end !== -1) {
    typed = typed.slice(0, end);
  }
  typed = typed.replace("%40", "@");             // an e-mail has @ in it
  for (let i = 0; i < users.length; i++) {
    let user = users[i];
    if (user.username === typed || user.email === typed) {
      return user;
    }
  }
  return null;
}

// Writes the logged in user's name in the top bar (the span with id="welcomeName")
function showWelcomeName(userId) {
  document.getElementById("welcomeName").innerHTML = getUserName(userId);
}

// The name of a user from the users array, e.g. getUserName("U-003") gives "Fahim Rahman"
function getUserName(userId) {
  let user = findById(users, userId);
  if (user === null) {
    return "-";
  }
  return user.name;
}

// 13000 -> "13,000 Tk"
// The comma is added by hand with a while loop: every 3 digits from the right
function formatTk(amount) {
  let text = String(Math.round(amount));
  let result = "";
  while (text.length > 3) {
    result = "," + text.slice(text.length - 3) + result;
    text = text.slice(0, text.length - 3);
  }
  return text + result + " Tk";
}

// 4 -> "★★★★☆"  (&#9733; is a filled star, &#9734; an empty one)
function showStars(count) {
  let text = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= count) {
      text += "&#9733;";
    } else {
      text += "&#9734;";
    }
  }
  return "<span class='stars'>" + text + "</span>";
}

// The route array shown as small tags with arrows: Dhaka -> Barishal -> Kuakata
function showRoute(route) {
  if (route.length === 0) {
    return "<span class='hint'>No route</span>";
  }
  let html = "";
  for (let i = 0; i < route.length; i++) {
    if (i > 0) {
      html += " <span class='route-arrow'>&rarr;</span> ";
    }
    html += "<span class='route-stop'>" + route[i] + "</span>";
  }
  return html;
}

// The route a booking really follows: the guide's custom route, or the package route
function getBookingRoute(booking) {
  if (booking.customRoute.length > 0) {
    return booking.customRoute;
  }
  let pack = findById(packages, booking.packageId);
  if (pack === null) {
    return [];
  }
  return pack.route;
}

// The last day of a tour: a 3 day tour starting on the 10th ends on the 12th
function getEndDate(booking) {
  let pack = findById(packages, booking.packageId);
  let days = 1;
  if (pack !== null) {
    days = pack.days;
  }
  return addDays(booking.travelDate, days - 1);
}

// The vehicle booked for a booking (or null)
function getVehicleForBooking(bookingId) {
  for (let i = 0; i < vehicleBookings.length; i++) {
    let vb = vehicleBookings[i];
    if (vb.bookingId === bookingId && vb.status === "Booked") {
      return findById(vehicles, vb.vehicleId);
    }
  }
  return null;
}

// One colour for every status word, chosen with a switch
function getStatusColor(status) {
  let color;
  switch (status) {
    case "Approved":
    case "Paid":
    case "Accepted":
    case "Active":
    case "Available":
    case "Booked":
      color = "green";
      break;
    case "Pending":
    case "Unpaid":
    case "Scheduled":
    case "Maintenance":
      color = "orange";
      break;
    case "In Progress":
    case "Completed":
    case "Released":
      color = "blue";
      break;
    default:
      color = "red";            // Rejected, Declined, Delayed, Blocked, Disabled, Cancelled
  }
  return color;
}

function statusBadge(status) {
  return "<span class='badge " + getStatusColor(status) + "'>" + status + "</span>";
}

// Average of the "rating" (or "guideRating") of some reviews. 0 when there are none.
function averageRating(reviewList, property) {
  let total = 0;
  let count = 0;
  for (let i = 0; i < reviewList.length; i++) {
    let review = reviewList[i];
    if (review[property] > 0) {
      total += review[property];
      count++;
    }
  }
  if (count === 0) {
    return 0;
  }
  return Math.round(total / count * 10) / 10;     // one decimal place, e.g. 3.5
}


/* ---------------------------------------------------------------------
   9. SEARCH THE TOUR PACKAGES (read only)
   Used by index.html and tourist.html. Both pages have the same ids:
   catalogSearch, catalogCategory, catalogBudget, catalogCount, catalogBody.
   --------------------------------------------------------------------- */
function renderCatalog() {
  let keyword = document.getElementById("catalogSearch").value;
  let category = document.getElementById("catalogCategory").value;
  let budget = Number(document.getElementById("catalogBudget").value);   // 0 = any budget

  let rows = "";
  let shown = 0;

  for (let i = 0; i < packages.length; i++) {
    let pack = packages[i];
    let matchesKeyword = containsText(pack.name, keyword) || containsText(pack.destination, keyword) ||
                         containsText(pack.route.join(" "), keyword);
    let matchesCategory = (category === "All" || pack.category === category);
    let matchesBudget = (budget === 0 || pack.price <= budget);

    // Packages disabled by the admin are not shown to the public
    if (pack.status === "Active" && matchesKeyword && matchesCategory && matchesBudget) {
      // Find the reviews of this package to show its average rating
      let packReviews = [];
      for (let j = 0; j < reviews.length; j++) {
        let review = reviews[j];
        if (review.packageId === pack.id) {
          packReviews.push(review);
        }
      }
      let ratingText = "<span class='hint'>No reviews yet</span>";
      if (packReviews.length > 0) {
        ratingText = showStars(Math.round(averageRating(packReviews, "rating"))) +
                     " <span class='hint'>(" + packReviews.length + ")</span>";
      }

      rows += "<tr>" +
                "<td><strong>" + pack.name + "</strong><br><span class='hint'>" + pack.includes + "</span></td>" +
                "<td>" + pack.destination + "</td>" +
                "<td>" + pack.category + "</td>" +
                "<td>" + pack.days + " day(s)</td>" +
                "<td>" + formatTk(pack.price) + "</td>" +
                "<td>" + ratingText + "</td>" +
              "</tr>";
      shown++;
    }
  }

  if (shown === 0) {
    rows = "<tr><td colspan='6' class='empty-row'>No tour packages match your search.</td></tr>";
  }

  document.getElementById("catalogBody").innerHTML = rows;
  document.getElementById("catalogCount").innerHTML = shown + " package(s) found";
}
