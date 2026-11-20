const sections = ["packagesSection", "approvalSection", "guideSection", "vehicleSection", "requestsSection"];

let editPackageIndex = -1;
let editVehicleIndex = -1;

const packageFields = ["packageName", "packageDestination", "packageCategory", "packageDays",
    "packagePrice", "packageSeats", "packageRoute"];
const vehicleFields = ["vehicleNumber", "vehicleType", "vehicleSeats", "vehicleDriver", "vehicleDriverPhone"];
const vehicleBookFields = ["vbBooking", "vbStart", "vbEnd", "vbVehicle"];


// Seats already taken on one package on one date (approved + completed bookings)
function seatsTaken(packageId, date) {
    let taken = 0;
    for (let i = 0; i < bookings.length; i++) {
        let booking = bookings[i];
        if (booking.packageId === packageId && booking.travelDate === date &&
            (booking.status === "Approved" || booking.status === "Completed")) {
            taken += booking.persons;
        }
    }
    return taken;
}

// true when two date ranges share at least one day
function datesOverlap(start1, end1, start2, end2) {
    return start1 <= end2 && start2 <= end1;
}

// true if the guide has another unfinished tour on these dates
function guideIsBusy(guideId, start, end, skipBookingId) {
    for (let i = 0; i < bookings.length; i++) {
        let booking = bookings[i];
        if (booking.guideId === guideId && booking.id !== skipBookingId && booking.tourStatus !== "Completed" &&
            datesOverlap(start, end, booking.travelDate, getEndDate(booking))) {
            return true;
        }
    }
    return false;
}

// true if the vehicle is already booked on these dates
function vehicleIsBusy(vehicleId, start, end) {
    for (let i = 0; i < vehicleBookings.length; i++) {
        let vb = vehicleBookings[i];
        if (vb.vehicleId === vehicleId && vb.status === "Booked" && datesOverlap(start, end, vb.startDate, vb.endDate)) {
            return true;
        }
    }
    return false;
}

// Returns an array with the active tour guides
function getActiveGuides() {
    let guides = [];
    for (let i = 0; i < users.length; i++) {
        let user = users[i];
        if (user.role === "Tour Guide" && user.status === "Active") {
            guides.push(user);
        }
    }
    return guides;
}


/* 
MANAGE PACKAGES: CREATE, READ, UPDATE, DELETE and SEARCH
*/
function renderPackages() {
    let keyword = document.getElementById("packageSearch").value;
    let categoryFilter = document.getElementById("packageCategoryFilter").value;
    let rows = "";
    let shown = 0;

    for (let i = 0; i < packages.length; i++) {
        let pack = packages[i];
        let matchesKeyword = containsText(pack.name, keyword) || containsText(pack.destination, keyword) ||
            containsText(pack.id, keyword);
        let matchesCategory = (categoryFilter === "All" || pack.category === categoryFilter);

        if (matchesKeyword && matchesCategory) {
            rows += "<tr>" +
                "<td>" + pack.id + "</td>" +
                "<td><strong>" + pack.name + "</strong><br><span class='hint'>" + pack.destination + "</span><br>" + showRoute(pack.route) + "</td>" +
                "<td>" + pack.category + "</td>" +
                "<td>" + pack.days + "</td>" +
                "<td>" + formatTk(pack.price) + "</td>" +
                "<td>" + pack.seats + "</td>" +
                "<td>" + statusBadge(pack.status) + "</td>" +
                "<td>" +
                "<button type='button' class='btn btn-small' onclick='editPackage(" + i + ")'>Edit</button>" +
                "<button type='button' class='btn btn-small btn-danger' onclick='deletePackage(" + i + ")'>Delete</button>" +
                "</td>" +
                "</tr>";
            shown++;
        }
    }

    if (shown === 0) {
        rows = "<tr><td colspan='8' class='empty-row'>No packages match your search.</td></tr>";
    }
    document.getElementById("packageTableBody").innerHTML = rows;
    document.getElementById("packageCount").innerHTML = "Showing " + shown + " of " + packages.length + " packages";
}

// "Dhaka, Bandarban , Nilgiri" -> ["Dhaka", "Bandarban", "Nilgiri"]
function textToRoute(text) {
    let route = [];
    let stop = "";
    for (let i = 0; i < text.length; i++) {
        if (text[i] === ",") {
            if (stop.trim() !== "") {
                route.push(stop.trim());
            }
            stop = "";
        } else {
            stop += text[i];
        }
    }
    if (stop.trim() !== "") {
        route.push(stop.trim());
    }
    return route;
}

function previewPackageRoute() {
    let route = textToRoute(document.getElementById("packageRoute").value);
    if (route.length === 0) {
        document.getElementById("routePreview").innerHTML = "";
    } else {
        document.getElementById("routePreview").innerHTML = showRoute(route);
    }
}

function savePackage() {
    let name = document.getElementById("packageName").value.trim();
    let destination = document.getElementById("packageDestination").value.trim();
    let category = document.getElementById("packageCategory").value;
    let daysText = document.getElementById("packageDays").value;
    let priceText = document.getElementById("packagePrice").value;
    let seatsText = document.getElementById("packageSeats").value;
    let includes = document.getElementById("packageIncludes").value.trim();
    let route = textToRoute(document.getElementById("packageRoute").value);

    let isValid = true;
    clearErrors(packageFields);
    hideMessage("packageMessage");

    if (name.length < 4) {
        showError("packageName", "Name must be at least 4 characters.");
        isValid = false;
    } else {
        // No two packages with the same name
        for (let i = 0; i < packages.length; i++) {
            if (i !== editPackageIndex && packages[i].name.toLowerCase() === name.toLowerCase()) {
                showError("packageName", "A package with this name already exists.");
                isValid = false;
            }
        }
    }

    if (destination.length < 3) {
        showError("packageDestination", "Please enter the destination.");
        isValid = false;
    }
    if (category === "") {
        showError("packageCategory", "Please choose a category.");
        isValid = false;
    }
    if (daysText === "" || Number(daysText) < 1 || Number(daysText) > 15) {
        showError("packageDays", "Days must be from 1 to 15.");
        isValid = false;
    }
    if (priceText === "" || Number(priceText) < 500) {
        showError("packagePrice", "Price must be at least 500 Tk.");
        isValid = false;
    }
    if (seatsText === "" || Number(seatsText) < 1 || Number(seatsText) > 60) {
        showError("packageSeats", "Seats must be from 1 to 60.");
        isValid = false;
    }
    if (route.length < 2) {
        showError("packageRoute", "Write at least 2 stops separated by commas.");
        isValid = false;
    }

    if (isValid === false) {
        return false;
    }

    if (editPackageIndex === -1) {
        let pack = {
            id: nextId("P", packages), name: name, destination: destination, category: category,
            days: Number(daysText), price: Number(priceText), seats: Number(seatsText),
            includes: includes, route: route, status: "Active"
        };
        packages.push(pack);
        console.log("New package:", pack);
        showMessage("packageMessage", "Package <strong>" + name + "</strong> (" + pack.id + ") was added.", "success");
    } else {
        let pack = packages[editPackageIndex];
        pack.name = name;
        pack.destination = destination;
        pack.category = category;
        pack.days = Number(daysText);
        pack.price = Number(priceText);
        pack.seats = Number(seatsText);
        pack.includes = includes;
        pack.route = route;
        showMessage("packageMessage", "Package " + pack.id + " was updated.", "success");
    }

    resetPackageForm();
    renderPackages();
    return false;
}

function editPackage(index) {
    let pack = packages[index];
    editPackageIndex = index;

    document.getElementById("packageName").value = pack.name;
    document.getElementById("packageDestination").value = pack.destination;
    document.getElementById("packageCategory").value = pack.category;
    document.getElementById("packageDays").value = pack.days;
    document.getElementById("packagePrice").value = pack.price;
    document.getElementById("packageSeats").value = pack.seats;
    document.getElementById("packageIncludes").value = pack.includes;
    document.getElementById("packageRoute").value = pack.route.join(", ");     // join() turns the array into text
    previewPackageRoute();

    document.getElementById("packageFormTitle").innerHTML = "Edit Package " + pack.id;
    document.getElementById("packageSaveButton").value = "Update Package";
    hideMessage("packageMessage");
}

function deletePackage(index) {
    let pack = packages[index];

    // A package with upcoming bookings can not be deleted
    for (let i = 0; i < bookings.length; i++) {
        let booking = bookings[i];
        if (booking.packageId === pack.id && (booking.status === "Pending" || booking.status === "Approved")) {
            showMessage("packageMessage", "<strong>" + pack.name + "</strong> has upcoming bookings, so it can not be deleted.", "error");
            return;
        }
    }

    if (confirm("Delete package " + pack.name + "?") === false) {
        return;
    }
    packages = removeAt(packages, index);
    showMessage("packageMessage", "Package <strong>" + pack.name + "</strong> was deleted.", "info");
    resetPackageForm();
    renderPackages();
}

function resetPackageForm() {
    editPackageIndex = -1;
    document.getElementById("packageForm").reset();
    clearErrors(packageFields);
    document.getElementById("routePreview").innerHTML = "";
    document.getElementById("packageFormTitle").innerHTML = "Add Package";
    document.getElementById("packageSaveButton").value = "Add Package";
}


/* 
UNIQUE FEATURE 1: BOOKING APPROVAL MANAGEMENT
*/
function renderPending() {
    let rows = "";

    for (let i = 0; i < bookings.length; i++) {
        let booking = bookings[i];
        if (booking.status !== "Pending") {
            continue;
        }

        let pack = findById(packages, booking.packageId);
        let left = pack.seats - seatsTaken(booking.packageId, booking.travelDate);
        let seatColor = "red";
        if (left >= booking.persons) {
            seatColor = "green";
        }

        // Count the special requests of this booking
        let requestCount = 0;
        for (let i = 0; i < specialRequests.length; i++) {
            let request = specialRequests[i];
            if (request.bookingId === booking.id) {
                requestCount++;
            }
        }
        let requestText = "";
        if (requestCount > 0) {
            requestText = "<br><span class='badge orange'>" + requestCount + " request</span>";
        }

        rows += "<tr>" +
            "<td>" + booking.id + "</td>" +
            "<td>" + booking.touristName + "</td>" +
            "<td><strong>" + booking.packageName + "</strong>" + requestText + "</td>" +
            "<td>" + booking.travelDate + "</td>" +
            "<td>" + booking.persons + "</td>" +
            "<td>" + formatTk(booking.total) + "</td>" +
            "<td><span class='badge " + seatColor + "'>" + left + " / " + pack.seats + "</span></td>" +
            "<td>" +
            "<button type='button' class='btn btn-small btn-secondary' onclick='checkSeats(" + i + ")'>Check</button>" +
            "<button type='button' class='btn btn-small btn-success' onclick='approveBooking(" + i + ")'>Approve</button>" +
            "<button type='button' class='btn btn-small btn-danger' onclick='rejectBooking(" + i + ")'>Reject</button>" +
            "</td>" +
            "</tr>";
    }

    if (rows === "") {
        rows = "<tr><td colspan='8' class='empty-row'>No bookings are waiting for approval.</td></tr>";
    }
    document.getElementById("pendingTableBody").innerHTML = rows;
}

// Shows the seats on that date as a progress bar
function checkSeats(index) {
    let booking = bookings[index];
    let pack = findById(packages, booking.packageId);
    let taken = seatsTaken(booking.packageId, booking.travelDate);
    let left = pack.seats - taken;

    let percent = Math.round((taken + booking.persons) / pack.seats * 100);
    if (percent > 100) {
        percent = 100;
    }

    let bar = document.getElementById("seatBar");
    bar.style.width = percent + "%";
    bar.innerHTML = percent + "%";

    let text = "<p><strong>" + booking.packageName + "</strong> on " + booking.travelDate + "</p>" +
        "<p>Seats: " + pack.seats + " &middot; Taken: " + taken + " &middot; Left: " + left + "</p>" +
        "<p>This booking needs <strong>" + booking.persons + "</strong> seat(s). ";

    if (booking.persons <= left) {
        if (percent > 80) {
            bar.style.backgroundColor = "#EF6C00";
        } else {
            bar.style.backgroundColor = "#2E7D32";
        }
        text += "<span class='badge green'>OK to approve</span></p>";
    } else {
        bar.style.backgroundColor = "#C62828";
        text += "<span class='badge red'>Not enough seats</span></p>";
    }
    document.getElementById("seatCheck").innerHTML = text;
}

function approveBooking(index) {
    let booking = bookings[index];
    let pack = findById(packages, booking.packageId);
    let left = pack.seats - seatsTaken(booking.packageId, booking.travelDate);

    if (booking.persons > left) {
        showMessage("approvalMessage", "Can not approve " + booking.id + ": only " + left + " seat(s) left on " + booking.travelDate + ".", "error");
        checkSeats(index);
        return;
    }

    booking.status = "Approved";
    showMessage("approvalMessage", "Booking " + booking.id + " of " + booking.touristName + " was approved. The tourist can pay now.", "success");
    refreshAll();
}

function rejectBooking(index) {
    let booking = bookings[index];
    if (confirm("Reject booking " + booking.id + "?") === false) {
        return;
    }
    booking.status = "Rejected";
    showMessage("approvalMessage", "Booking " + booking.id + " was rejected.", "info");
    refreshAll();
}

// READ + SEARCH over every booking
function renderAllBookings() {
    let keyword = document.getElementById("allBookingSearch").value;
    let statusFilter = document.getElementById("allBookingFilter").value;
    let rows = "";
    let shown = 0;

    for (let i = 0; i < bookings.length; i++) {
        let booking = bookings[i];
        let matchesKeyword = containsText(booking.touristName, keyword) || containsText(booking.packageName, keyword) ||
            containsText(booking.id, keyword);
        let matchesStatus = (statusFilter === "All" || booking.status === statusFilter);

        if (matchesKeyword && matchesStatus) {
            rows += "<tr><td>" + booking.id + "</td><td>" + booking.touristName + "</td><td>" + booking.packageName +
                "</td><td>" + booking.travelDate + "</td><td>" + booking.persons + "</td><td>" + formatTk(booking.total) +
                "</td><td>" + statusBadge(booking.status) + "</td><td>" + statusBadge(booking.payment) + "</td></tr>";
            shown++;
        }
    }
    if (shown === 0) {
        rows = "<tr><td colspan='8' class='empty-row'>No bookings match your search.</td></tr>";
    }
    document.getElementById("allBookingBody").innerHTML = rows;
    document.getElementById("allBookingCount").innerHTML = "Showing " + shown + " of " + bookings.length + " bookings";
}


/*
UNIQUE FEATURE 2: GUIDE ASSIGNMENT
*/
function renderAssignOptions() {
    let bookingSelect = document.getElementById("assignBooking");
    bookingSelect.innerHTML = "<option value=''>-- Select Booking --</option>";

    for (let i = 0; i < bookings.length; i++) {
        let booking = bookings[i];
        if (booking.status === "Approved" && booking.guideId === "") {
            let option = document.createElement("option");
            option.value = booking.id;
            option.innerHTML = booking.id + " " + booking.packageName + " (" + booking.travelDate + " to " + getEndDate(booking) + ")";
            bookingSelect.appendChild(option);
        }
    }
    markBusyGuides();
}

// Rebuilds the guide list: guides who are busy on the chosen dates are disabled
function markBusyGuides() {
    let bookingId = document.getElementById("assignBooking").value;
    let guideSelect = document.getElementById("assignGuideSelect");
    let guides = getActiveGuides();
    let freeCount = 0;

    guideSelect.innerHTML = "<option value=''>-- Select Guide --</option>";

    for (let i = 0; i < guides.length; i++) {
        let guide = guides[i];
        let option = document.createElement("option");
        option.value = guide.id;
        option.innerHTML = guide.name + " (" + guide.expertise + ")";

        if (bookingId !== "") {
            let booking = findById(bookings, bookingId);
            if (guideIsBusy(guide.id, booking.travelDate, getEndDate(booking), "")) {
                option.disabled = true;
                option.innerHTML += " - busy";
            } else {
                freeCount++;
            }
        }
        guideSelect.appendChild(option);
    }

    let hint = document.getElementById("guideHint");
    if (bookingId === "") {
        hint.innerHTML = "";
    } else {
        hint.innerHTML = freeCount + " guide(s) are free on these dates.";
        if (freeCount === 0) {
            hint.style.color = "#C62828";
        } else {
            hint.style.color = "";
        }
    }
}

function assignGuide() {
    let bookingId = document.getElementById("assignBooking").value;
    let guideId = document.getElementById("assignGuideSelect").value;
    let isValid = true;

    clearErrors(["assignBooking", "assignGuideSelect"]);
    hideMessage("guideMessage");

    if (bookingId === "") {
        showError("assignBooking", "Choose an approved booking.");
        isValid = false;
    }
    if (guideId === "") {
        showError("assignGuideSelect", "Choose a free guide.");
        isValid = false;
    }
    if (isValid === false) {
        return false;
    }

    let booking = findById(bookings, bookingId);
    if (guideIsBusy(guideId, booking.travelDate, getEndDate(booking), "")) {
        showError("assignGuideSelect", "This guide is busy on these dates.");
        return false;
    }

    booking.guideId = guideId;
    booking.tourStatus = "Scheduled";
    showMessage("guideMessage", "<strong>" + getUserName(guideId) + "</strong> is now the guide of " + booking.id + ".", "success");
    refreshAll();
    return false;
}

function renderAssignments() {
    let guides = getActiveGuides();
    let rows = "";

    for (let i = 0; i < bookings.length; i++) {
        let booking = bookings[i];
        if (booking.guideId === "") {
            continue;
        }
        let isDone = (booking.tourStatus === "Completed");

        // A drop-down to change the guide (only for tours that are not finished)
        let changeCell = "&mdash;";
        let removeCell = "&mdash;";
        if (isDone === false) {
            changeCell = "<select id='change-" + booking.id + "' class='inline-input'>";
            for (let i = 0; i < guides.length; i++) {
                let guide = guides[i];
                let selected = "";
                if (guide.id === booking.guideId) {
                    selected = " selected";
                }
                changeCell += "<option value='" + guide.id + "'" + selected + ">" + guide.name + "</option>";
            }
            changeCell += "</select> <button type='button' class='btn btn-small' onclick='changeGuide(" + i + ")'>Save</button>";
            removeCell = "<button type='button' class='btn btn-small btn-danger' onclick='removeGuide(" + i + ")'>Remove</button>";
        }

        rows += "<tr><td>" + booking.id + "</td><td>" + booking.packageName + "</td><td>" + booking.travelDate + " to " +
            getEndDate(booking) + "</td><td>" + getUserName(booking.guideId) + "</td><td>" + statusBadge(booking.tourStatus) +
            "</td><td>" + changeCell + "</td><td>" + removeCell + "</td></tr>";
    }

    if (rows === "") {
        rows = "<tr><td colspan='7' class='empty-row'>No guides assigned yet.</td></tr>";
    }
    document.getElementById("assignmentTableBody").innerHTML = rows;

    // Workload: how many unfinished tours every guide has
    let names = [];
    let counts = [];
    let total = 0;
    for (let i = 0; i < guides.length; i++) {
        let guide = guides[i];
        let count = 0;
        for (let j = 0; j < bookings.length; j++) {
            let booking = bookings[j];
            if (booking.guideId === guide.id && booking.tourStatus !== "Completed") {
                count++;
            }
        }
        names.push(guide.name);
        counts.push(count);
        total += count;
    }
    drawBarChart("workloadChart", names, counts, total);
}

function changeGuide(index) {
    let booking = bookings[index];
    let newGuideId = document.getElementById("change-" + booking.id).value;

    if (newGuideId === booking.guideId) {
        showMessage("guideMessage", "That guide is already on this tour.", "info");
        return;
    }
    if (guideIsBusy(newGuideId, booking.travelDate, getEndDate(booking), booking.id)) {
        showMessage("guideMessage", getUserName(newGuideId) + " is busy on " + booking.travelDate + ".", "error");
        return;
    }
    booking.guideId = newGuideId;
    showMessage("guideMessage", "The guide of " + booking.id + " is now " + getUserName(newGuideId) + ".", "success");
    refreshAll();
}

function removeGuide(index) {
    let booking = bookings[index];
    booking.guideId = "";
    booking.tourStatus = "";
    showMessage("guideMessage", "The guide was removed from " + booking.id + ".", "info");
    refreshAll();
}

// Draws simple horizontal bars (same as the admin's report)
function drawBarChart(chartId, names, counts, total) {
    let html = "";
    for (let i = 0; i < names.length; i++) {
        let percent = 0;
        if (total > 0) {
            percent = Math.round(counts[i] / total * 100);
        }
        html += "<div class='bar-row'>" +
            "<div class='bar-label'>" + names[i] + "</div>" +
            "<div class='bar-track'><div class='bar-fill' style='width:" + percent + "%'></div></div>" +
            "<div class='bar-value'>" + counts[i] + "</div>" +
            "</div>";
    }
    document.getElementById(chartId).innerHTML = html;
}


/*
   UNIQUE FEATURE 3: VEHICLE ASSIGN AND BOOKING
*/

// Approved bookings that do not have a vehicle yet
function renderVehicleBookOptions() {
    let select = document.getElementById("vbBooking");
    select.innerHTML = "<option value=''>Select Booking</option>";

    for (let i = 0; i < bookings.length; i++) {
        let booking = bookings[i];
        if (booking.status === "Approved" && getVehicleForBooking(booking.id) === null) {
            let option = document.createElement("option");
            option.value = booking.id;
            option.innerHTML = booking.id + " " + booking.packageName + " - " + booking.persons + " persons (" + booking.travelDate + ")";
            select.appendChild(option);
        }
    }
    fillVehicleDates();
}

// The dates of the tour are filled in for the manager
function fillVehicleDates() {
    let bookingId = document.getElementById("vbBooking").value;
    if (bookingId === "") {
        document.getElementById("vbStart").value = "";
        document.getElementById("vbEnd").value = "";
    } else {
        let booking = findById(bookings, bookingId);
        document.getElementById("vbStart").value = booking.travelDate;
        document.getElementById("vbEnd").value = getEndDate(booking);
    }
    markVehicles();
}

// Rebuilds the vehicle list. A vehicle is disabled when it is in
// maintenance, too small for the group, or already booked on those dates.
function markVehicles() {
    let bookingId = document.getElementById("vbBooking").value;
    let start = document.getElementById("vbStart").value;
    let end = document.getElementById("vbEnd").value;
    let select = document.getElementById("vbVehicle");
    let persons = 0;
    let okCount = 0;

    if (bookingId !== "") {
        persons = findById(bookings, bookingId).persons;
    }

    select.innerHTML = "<option value=''>-- Select Vehicle --</option>";

    for (let i = 0; i < vehicles.length; i++) {
        let vehicle = vehicles[i];
        let option = document.createElement("option");
        option.value = vehicle.id;
        option.innerHTML = vehicle.type + " " + vehicle.number + " (" + vehicle.seats + " seats)";

        let reason = "";
        if (vehicle.status === "Maintenance") {
            reason = "maintenance";
        } else if (vehicle.seats < persons) {
            reason = "too small";
        } else if (start !== "" && end !== "" && vehicleIsBusy(vehicle.id, start, end)) {
            reason = "booked";
        }

        if (reason !== "") {
            option.disabled = true;
            option.innerHTML += " - " + reason;
        } else {
            okCount++;
        }
        select.appendChild(option);
    }

    let hint = document.getElementById("vehicleHint");
    if (bookingId === "") {
        hint.innerHTML = "";
    } else {
        hint.innerHTML = okCount + " vehicle(s) can take " + persons + " persons on these dates.";
        if (okCount === 0) {
            hint.style.color = "#C62828";
        } else {
            hint.style.color = "";
        }
    }
}

function bookVehicle() {
    let bookingId = document.getElementById("vbBooking").value;
    let start = document.getElementById("vbStart").value;
    let end = document.getElementById("vbEnd").value;
    let vehicleId = document.getElementById("vbVehicle").value;
    let isValid = true;

    clearErrors(vehicleBookFields);
    hideMessage("vehicleMessage");

    if (bookingId === "") {
        showError("vbBooking", "Choose an approved booking.");
        isValid = false;
    }
    if (start === "") {
        showError("vbStart", "Choose the first day.");
        isValid = false;
    }
    if (end === "") {
        showError("vbEnd", "Choose the last day.");
        isValid = false;
    } else if (start !== "" && daysBetween(start, end) < 0) {
        showError("vbEnd", "The last day can not be before the first day.");
        isValid = false;
    }
    if (vehicleId === "") {
        showError("vbVehicle", "Choose a free vehicle.");
        isValid = false;
    }
    if (isValid === false) {
        return false;
    }

    let booking = findById(bookings, bookingId);
    let vehicle = findById(vehicles, vehicleId);

    if (vehicle.seats < booking.persons) {
        showError("vbVehicle", "This vehicle has only " + vehicle.seats + " seats.");
        return false;
    }
    if (vehicleIsBusy(vehicleId, start, end)) {
        showError("vbVehicle", "This vehicle is already booked on these dates.");
        return false;
    }

    let vb = {
        id: nextId("VB", vehicleBookings), vehicleId: vehicleId, bookingId: bookingId,
        startDate: start, endDate: end, status: "Booked"
    };
    vehicleBookings.push(vb);
    console.log("Vehicle booking:", vb);

    showMessage("vehicleMessage", vehicle.type + " <strong>" + vehicle.number + "</strong> was booked for " +
        bookingId + " (" + start + " to " + end + ").", "success");
    refreshAll();
    return false;
}

function renderVehicleBookings() {
    let rows = "";
    for (let i = 0; i < vehicleBookings.length; i++) {
        let vb = vehicleBookings[i];
        let vehicle = findById(vehicles, vb.vehicleId);
        let booking = findById(bookings, vb.bookingId);

        let actions = "&mdash;";
        if (vb.status === "Booked") {
            actions = "<button type='button' class='btn btn-small btn-success' onclick='changeVehicleBooking(" + i + ", \"Released\")'>Release</button>" +
                "<button type='button' class='btn btn-small btn-danger' onclick='changeVehicleBooking(" + i + ", \"Cancelled\")'>Cancel</button>";
        }

        rows += "<tr><td>" + vb.id + "</td><td><strong>" + vehicle.number + "</strong><br><span class='hint'>" + vehicle.type +
            "</span></td><td>" + vehicle.driver + "<br><span class='hint'>" + vehicle.driverPhone + "</span></td><td>" +
            booking.id + " " + booking.packageName + " (" + booking.persons + " persons)</td><td>" + vb.startDate + " to " +
            vb.endDate + "</td><td>" + statusBadge(vb.status) + "</td><td>" + actions + "</td></tr>";
    }
    if (rows === "") {
        rows = "<tr><td colspan='7' class='empty-row'>No vehicle bookings yet.</td></tr>";
    }
    document.getElementById("vehicleBookingBody").innerHTML = rows;
}

function changeVehicleBooking(index, newStatus) {
    let vb = vehicleBookings[index];
    vb.status = newStatus;
    showMessage("vehicleMessage", "Vehicle booking " + vb.id + " is now " + newStatus + ".", "info");
    refreshAll();
}

//Create, Read, Update, Delete vehicles
function renderVehicles() {
    let rows = "";
    for (let i = 0; i < vehicles.length; i++) {
        let vehicle = vehicles[i];
        rows += "<tr><td>" + vehicle.id + "</td><td><strong>" + vehicle.number + "</strong></td><td>" + vehicle.type +
            "</td><td>" + vehicle.seats + "</td><td>" + vehicle.driver + "<br><span class='hint'>" + vehicle.driverPhone +
            "</span></td><td>" + statusBadge(vehicle.status) + "</td><td>" +
            "<button type='button' class='btn btn-small' onclick='editVehicle(" + i + ")'>Edit</button>" +
            "<button type='button' class='btn btn-small btn-danger' onclick='deleteVehicle(" + i + ")'>Delete</button></td></tr>";
    }
    if (rows === "") {
        rows = "<tr><td colspan='7' class='empty-row'>No vehicles yet.</td></tr>";
    }
    document.getElementById("vehicleTableBody").innerHTML = rows;
}

function saveVehicle() {
    let number = document.getElementById("vehicleNumber").value.trim().toUpperCase();
    let type = document.getElementById("vehicleType").value;
    let seatsText = document.getElementById("vehicleSeats").value;
    let driver = document.getElementById("vehicleDriver").value.trim();
    let phone = document.getElementById("vehicleDriverPhone").value.trim();
    let status = getRadioValue("vehicleStatus");
    let isValid = true;

    clearErrors(vehicleFields);
    hideMessage("vehicleMessage");

    if (number.length < 6) {
        showError("vehicleNumber", "Please enter the number plate.");
        isValid = false;
    } else {
        for (let i = 0; i < vehicles.length; i++) {
            if (i !== editVehicleIndex && vehicles[i].number === number) {
                showError("vehicleNumber", "This vehicle is already in the fleet.");
                isValid = false;
            }
        }
    }
    if (type === "") {
        showError("vehicleType", "Choose a vehicle type.");
        isValid = false;
    }
    if (seatsText === "" || Number(seatsText) < 2 || Number(seatsText) > 60) {
        showError("vehicleSeats", "Seats must be from 2 to 60.");
        isValid = false;
    }
    if (driver.length < 3) {
        showError("vehicleDriver", "Please enter the driver's name.");
        isValid = false;
    }
    if (isDigitsOnly(phone) === false || phone.length !== 11 || phone.slice(0, 2) !== "01") {
        showError("vehicleDriverPhone", "Phone must be 11 digits and start with 01.");
        isValid = false;
    }
    if (isValid === false) {
        return false;
    }

    if (editVehicleIndex === -1) {
        let vehicle = {
            id: nextId("V", vehicles), number: number, type: type, seats: Number(seatsText),
            driver: driver, driverPhone: phone, status: status
        };
        vehicles.push(vehicle);
        showMessage("vehicleMessage", "Vehicle " + number + " was added to the fleet.", "success");
    } else {
        let vehicle = vehicles[editVehicleIndex];
        vehicle.number = number;
        vehicle.type = type;
        vehicle.seats = Number(seatsText);
        vehicle.driver = driver;
        vehicle.driverPhone = phone;
        vehicle.status = status;
        showMessage("vehicleMessage", "Vehicle " + number + " was updated.", "success");
    }

    resetVehicleForm();
    refreshAll();
    return false;
}

function editVehicle(index) {
    let vehicle = vehicles[index];
    editVehicleIndex = index;
    document.getElementById("vehicleNumber").value = vehicle.number;
    document.getElementById("vehicleType").value = vehicle.type;
    document.getElementById("vehicleSeats").value = vehicle.seats;
    document.getElementById("vehicleDriver").value = vehicle.driver;
    document.getElementById("vehicleDriverPhone").value = vehicle.driverPhone;
    setRadioValue("vehicleStatus", vehicle.status);
    document.getElementById("vehicleFormTitle").innerHTML = "Edit Vehicle " + vehicle.id;
    document.getElementById("vehicleSaveButton").value = "Update Vehicle";
}

function deleteVehicle(index) {
    let vehicle = vehicles[index];
    for (let i = 0; i < vehicleBookings.length; i++) {
        let vb = vehicleBookings[i];
        if (vb.vehicleId === vehicle.id && vb.status === "Booked") {
            showMessage("vehicleMessage", vehicle.number + " has an active booking. Release or cancel it first.", "error");
            return;
        }
    }
    if (confirm("Delete vehicle " + vehicle.number + "?") === false) {
        return;
    }
    vehicles = removeAt(vehicles, index);
    showMessage("vehicleMessage", "Vehicle " + vehicle.number + " was deleted.", "info");
    resetVehicleForm();
    refreshAll();
}

function resetVehicleForm() {
    editVehicleIndex = -1;
    document.getElementById("vehicleForm").reset();
    clearErrors(vehicleFields);
    document.getElementById("vehicleFormTitle").innerHTML = "Add Vehicle";
    document.getElementById("vehicleSaveButton").value = "Add Vehicle";
}


/* 
   SPECIAL REQUESTS: accept or decline with a reply
*/
function renderRequests() {
    let filter = document.getElementById("requestFilter").value;
    let list = document.getElementById("requestList");
    list.innerHTML = "";

    for (let i = 0; i < specialRequests.length; i++) {
        let request = specialRequests[i];
        if (filter === "Pending" && request.status !== "Pending") {
            continue;
        }

        let booking = findById(bookings, request.bookingId);
        let item = document.createElement("div");
        item.className = "log-item";
        if (request.status === "Pending") {
            item.style.borderLeftColor = "#EF6C00";
        } else {
            item.style.borderLeftColor = "#6C757D";
        }

        let html = "<span class='log-time'>" + request.id + " &middot; " + request.date + " &middot; " + request.touristName +
            " &middot; " + booking.id + " " + booking.packageName + " (" + booking.travelDate + ")</span><br>" +
            "<span class='badge blue'>" + request.type + "</span> " + request.details + " " + statusBadge(request.status);

        if (request.status === "Pending") {
            html += "<p class='form-buttons'>" +
                "<input type='text' id='reply-" + request.id + "' class='inline-input' placeholder='Reply to the tourist'> " +
                "<button type='button' class='btn btn-small btn-success' onclick='answerRequest(" + i + ", \"Accepted\")'>Accept</button>" +
                "<button type='button' class='btn btn-small btn-danger' onclick='answerRequest(" + i + ", \"Declined\")'>Decline</button>" +
                "</p>";
        } else {
            html += "<br><span class='hint'>Reply: " + request.reply + "</span>";
        }
        item.innerHTML = html;
        list.appendChild(item);
    }

    if (list.innerHTML === "") {
        list.innerHTML = "<p class='empty-row'>No requests to show.</p>";
    }
}

function answerRequest(index, decision) {
    let request = specialRequests[index];
    let reply = document.getElementById("reply-" + request.id).value.trim();

    if (reply.length < 3) {
        showMessage("requestMessage", "Write a short reply for " + request.touristName + " first.", "error");
        return;
    }
    request.status = decision;
    request.reply = reply;
    showMessage("requestMessage", "Request " + request.id + " was " + decision.toLowerCase() + ".", "success");
    renderRequests();
}


/* 
   START
*/
function refreshAll() {
    renderPackages();
    renderPending();
    renderAllBookings();
    renderAssignOptions();
    renderAssignments();
    renderVehicleBookOptions();
    renderVehicleBookings();
    renderVehicles();
    renderRequests();
}

refreshAll();
showSection("packagesSection");

// Show the name of the user who logged in (the top bar)
let loggedInUser = getLoggedInUser();
if (loggedInUser !== null) {
    showWelcomeName(loggedInUser.id);
}
