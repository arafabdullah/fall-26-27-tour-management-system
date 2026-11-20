/* =====================================================================
   register.js  -  One registration form for Tourist, Tour Guide, Manager
   ---------------------------------------------------------------------
   1. The user picks a type with the "userType" radio buttons.
   2. showTypeFields() shows the common fields plus ONLY the fieldset
      for that type, using  element.style.display  (DOM + CSS).
   3. validateRegister() checks the common fields, then uses a switch
      to check the fields of the chosen type.
   4. If everything is valid, a new user object is push()ed into the
      users array. Guides and managers start as "Pending" until an admin approves.
   ===================================================================== */

// Fields shared by every type of user
const commonFields = ["fullName", "email", "phone", "gender", "dob",
                      "newUsername", "newPassword", "confirmPassword"];

// Fields that belong to one type only
const touristFields = ["nid", "nationality", "emergencyPhone"];
const guideFields = ["licenseNo", "expertise", "experience", "language"];
const managerFields = ["employeeId", "branch", "designation"];


/* ---------------------------------------------------------------------
   SHOW THE RIGHT FIELDS FOR THE CHOSEN TYPE
   --------------------------------------------------------------------- */
function showTypeFields() {
  let type = getRadioValue("userType");

  // The common part of the form appears once any type is chosen
  if (type === "") {
    document.getElementById("formBody").style.display = "none";
  } else {
    document.getElementById("formBody").style.display = "block";
  }

  // Show one type fieldset, hide the other two
  document.getElementById("touristFields").style.display = "none";
  document.getElementById("guideFields").style.display = "none";
  document.getElementById("managerFields").style.display = "none";
  if (type === "Tourist") {
    document.getElementById("touristFields").style.display = "block";
  } else if (type === "Tour Guide") {
    document.getElementById("guideFields").style.display = "block";
  } else if (type === "Agency Manager") {
    document.getElementById("managerFields").style.display = "block";
  }

  // Highlight the chosen card (className changes which CSS rule applies)
  document.getElementById("typeCardTourist").className = "type-option";
  document.getElementById("typeCardGuide").className = "type-option";
  document.getElementById("typeCardManager").className = "type-option";
  if (type === "Tourist") {
    document.getElementById("typeCardTourist").className = "type-option selected";
  } else if (type === "Tour Guide") {
    document.getElementById("typeCardGuide").className = "type-option selected";
  } else if (type === "Agency Manager") {
    document.getElementById("typeCardManager").className = "type-option selected";
  }

  // The button text tells the user what will be created
  if (type !== "") {
    document.getElementById("registerButton").value = "Create " + type + " Account";
  }

  clearAllRegisterErrors();
}


/* ---------------------------------------------------------------------
   VALIDATION
   --------------------------------------------------------------------- */
function validateRegister() {
  let type = getRadioValue("userType");
  clearAllRegisterErrors();

  if (type === "") {
    showError("userType", "Please choose the type of account.");
    return false;
  }

  // Run the common checks and the checks for this type
  let commonOk = validateCommon(type);
  let typeOk;

  switch (type) {
    case "Tourist":
      typeOk = validateTourist();
      break;
    case "Tour Guide":
      typeOk = validateGuide();
      break;
    case "Agency Manager":
      typeOk = validateManager();
      break;
  }

  if (!(commonOk && typeOk)) {
    showMessage("registerMessage", "Please fix the fields marked in red.", "error");
    return false;
  }

  // ----- Everything is valid: build the new user object -----
  let newUser = {
    id: nextId("U", users),
    name: document.getElementById("fullName").value.trim(),
    username: document.getElementById("newUsername").value.trim(),
    password: document.getElementById("newPassword").value,
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    gender: getRadioValue("gender"),
    dob: document.getElementById("dob").value,
    role: type,
    status: "Active"
  };

  // Add the properties that only this type has
  if (type === "Tourist") {
    newUser.nid = document.getElementById("nid").value.trim();
    newUser.nationality = document.getElementById("nationality").value;
    newUser.emergencyPhone = document.getElementById("emergencyPhone").value.trim();
    newUser.interests = getCheckedValues("interest");
  } else if (type === "Tour Guide") {
    newUser.licenseNo = document.getElementById("licenseNo").value.trim().toUpperCase();
    newUser.expertise = document.getElementById("expertise").value;
    newUser.experience = Number(document.getElementById("experience").value);
    newUser.languages = getCheckedValues("language");
    newUser.status = "Pending";              // an admin must approve guides
  } else {
    newUser.employeeId = document.getElementById("employeeId").value.trim().toUpperCase();
    newUser.branch = getRadioValue("branch");
    newUser.designation = document.getElementById("designation").value;
    newUser.status = "Pending";              // an admin must approve managers
  }

  users.push(newUser);
  console.log("New user:", newUser);

  let text = "Welcome, <strong>" + newUser.name + "</strong>! Your " + type.toLowerCase() +
             " account was created (user id " + newUser.id + "). ";
  if (newUser.status === "Pending") {
    text += "An admin will check your details; you can log in after approval.";
  } else {
    text += "<a href='login.html'>Log in now</a>.";
  }
  text += "<br><span class='hint'>Frontend version: the account is kept until this page reloads. " +
          "The PHP backend will save it permanently.</span>";
  showMessage("registerMessage", text, "success");

  // Empty the form and go back to step 1
  document.getElementById("registerForm").reset();
  resetRegisterForm();
  return false;   // stay on this page so the message can be read
}


// Checks shared by every type. "type" decides the minimum age.
function validateCommon(type) {
  let isValid = true;

  let fullName = document.getElementById("fullName").value.trim();
  let email = document.getElementById("email").value.trim();
  let phone = document.getElementById("phone").value.trim();
  let dob = document.getElementById("dob").value;
  let username = document.getElementById("newUsername").value.trim();
  let password = document.getElementById("newPassword").value;
  let confirmPassword = document.getElementById("confirmPassword").value;

  if (fullName.length < 3) {
    showError("fullName", "Full name must be at least 3 characters.");
    isValid = false;
  }

  if (isEmpty(email)) {
    showError("email", "Email is required.");
    isValid = false;
  } else if (isValidEmail(email) === false) {
    showError("email", "Please enter a valid email address.");
    isValid = false;
  } else if (isTaken("email", email)) {
    showError("email", "An account with this email already exists.");
    isValid = false;
  }

  if (isDigitsOnly(phone) === false || phone.length !== 11 || phone.slice(0, 2) !== "01") {
    showError("phone", "Phone must be 11 digits and start with 01.");
    isValid = false;
  }

  if (getRadioValue("gender") === "") {
    showError("gender", "Please select an option.");
    isValid = false;
  }

  // Minimum age depends on the type of user
  let minimumAge;
  switch (type) {
    case "Agency Manager":
      minimumAge = 21;
      break;
    case "Tour Guide":
      minimumAge = 18;
      break;
    default:
      minimumAge = 12;
  }

  if (dob === "") {
    showError("dob", "Date of birth is required.");
    isValid = false;
  } else if (daysBetween(dob, todayString()) / 365 < minimumAge) {
    showError("dob", "A " + type.toLowerCase() + " must be at least " + minimumAge + " years old.");
    isValid = false;
  }

  if (username.length < 4) {
    showError("newUsername", "Username must be at least 4 characters.");
    isValid = false;
  } else if (username.indexOf(" ") !== -1) {
    showError("newUsername", "Username cannot contain spaces.");
    isValid = false;
  } else if (isTaken("username", username)) {
    showError("newUsername", "This username is already taken.");
    isValid = false;
  }

  if (password.length < 8) {
    showError("newPassword", "Password must be at least 8 characters.");
    isValid = false;
  } else if (hasDigit(password) === false) {
    showError("newPassword", "Password must contain at least one digit.");
    isValid = false;
  }

  if (confirmPassword === "" || confirmPassword !== password) {
    showError("confirmPassword", "Password and Confirm Password must match.");
    isValid = false;
  }

  return isValid;
}


function validateTourist() {
  let isValid = true;
  let nid = document.getElementById("nid").value.trim();
  let nationality = document.getElementById("nationality").value;
  let emergency = document.getElementById("emergencyPhone").value.trim();
  let phone = document.getElementById("phone").value.trim();

  // A Bangladeshi NID has 10, 13 or 17 digits; a passport number has 9 letters/digits
  if (nationality === "Bangladeshi") {
    if (isDigitsOnly(nid) === false || (nid.length !== 10 && nid.length !== 13 && nid.length !== 17)) {
      showError("nid", "NID must be 10, 13 or 17 digits.");
      isValid = false;
    } else if (isTaken("nid", nid)) {
      showError("nid", "This NID is already registered.");
      isValid = false;
    }
  } else if (nid.length < 6) {
    showError("nid", "Please enter your passport number.");
    isValid = false;
  }

  if (nationality === "") {
    showError("nationality", "Please select your nationality.");
    isValid = false;
  }

  if (isDigitsOnly(emergency) === false || emergency.length !== 11 || emergency.slice(0, 2) !== "01") {
    showError("emergencyPhone", "Emergency phone must be 11 digits and start with 01.");
    isValid = false;
  } else if (emergency === phone) {
    showError("emergencyPhone", "Give a different number from your own phone.");
    isValid = false;
  }

  return isValid;
}


function validateGuide() {
  let isValid = true;
  let licenseNo = document.getElementById("licenseNo").value.trim().toUpperCase();
  let expertise = document.getElementById("expertise").value;
  let experienceText = document.getElementById("experience").value;
  let experience = Number(experienceText);
  let languages = getCheckedValues("language");

  // GL-1234 : the letters GL, a dash and 4 digits
  if (licenseNo.length !== 7 || licenseNo.slice(0, 3) !== "GL-" || isDigitsOnly(licenseNo.slice(3)) === false) {
    showError("licenseNo", "License number must look like GL-1234.");
    isValid = false;
  } else if (isTaken("licenseNo", licenseNo)) {
    showError("licenseNo", "This license number is already registered.");
    isValid = false;
  }

  if (expertise === "") {
    showError("expertise", "Please select your area.");
    isValid = false;
  }

  if (experienceText === "" || experience < 0 || experience > 40) {
    showError("experience", "Experience must be between 0 and 40 years.");
    isValid = false;
  }

  if (languages.length === 0) {
    showError("language", "Tick at least one language you can speak.");
    isValid = false;
  }

  return isValid;
}


function validateManager() {
  let isValid = true;
  let employeeId = document.getElementById("employeeId").value.trim().toUpperCase();

  // EMP-1234 : the letters EMP, a dash and 4 digits
  if (employeeId.length !== 8 || employeeId.slice(0, 4) !== "EMP-" || isDigitsOnly(employeeId.slice(4)) === false) {
    showError("employeeId", "Employee ID must look like EMP-1234.");
    isValid = false;
  } else if (isTaken("employeeId", employeeId)) {
    showError("employeeId", "This employee ID is already registered.");
    isValid = false;
  }

  if (getRadioValue("branch") === "") {
    showError("branch", "Please choose a branch.");
    isValid = false;
  }

  if (document.getElementById("designation").value === "") {
    showError("designation", "Please select your designation.");
    isValid = false;
  }

  return isValid;
}


/* ---------------------------------------------------------------------
   SMALL HELPERS
   --------------------------------------------------------------------- */

// true if any user already has this value in this property, e.g. isTaken("email", "a@b.com")
// Bracket notation user[property] reads a property whose name is in a variable.
function isTaken(property, value) {
  for (let i = 0; i < users.length; i++) {
    let user = users[i];
    if (user[property] !== undefined && String(user[property]).toLowerCase() === value.toLowerCase()) {
      return true;
    }
  }
  return false;
}

function hasDigit(text) {
  let digits = "0123456789";
  for (let i = 0; i < text.length; i++) {
    if (digits.indexOf(text[i]) !== -1) {
      return true;
    }
  }
  return false;
}

// Collects the values of every ticked checkbox in a group into an array
function getCheckedValues(groupName) {
  let boxes = document.getElementsByName(groupName);
  let selected = [];
  for (let i = 0; i < boxes.length; i++) {
    if (boxes[i].checked) {
      selected.push(boxes[i].value);
    }
  }
  return selected;
}

// Live password strength (onkeyup): counts how many rules the password meets
function showPasswordStrength() {
  let password = document.getElementById("newPassword").value;
  let text = document.getElementById("strengthText");
  let score = 0;

  if (password.length >= 8) { score++; }
  if (password.length >= 12) { score++; }
  if (hasDigit(password)) { score++; }
  if (password.toLowerCase() !== password) { score++; }   // has a capital letter

  if (password === "") {
    text.innerHTML = "";
  } else if (score <= 1) {
    text.innerHTML = "Strength: weak";
    text.style.color = "#C62828";
  } else if (score <= 2) {
    text.innerHTML = "Strength: fair";
    text.style.color = "#EF6C00";
  } else {
    text.innerHTML = "Strength: strong";
    text.style.color = "#2E7D32";
  }
}

// DHTML: the button is enabled only when the terms box is ticked
function toggleRegisterButton() {
  document.getElementById("registerButton").disabled = !document.getElementById("terms").checked;
}

function clearAllRegisterErrors() {
  clearError("userType");
  clearErrors(commonFields);
  clearErrors(touristFields);
  clearErrors(guideFields);
  clearErrors(managerFields);
}

// Back to step 1: hide everything below the type cards
function resetRegisterForm() {
  clearAllRegisterErrors();
  document.getElementById("formBody").style.display = "none";
  document.getElementById("typeCardTourist").className = "type-option";
  document.getElementById("typeCardGuide").className = "type-option";
  document.getElementById("typeCardManager").className = "type-option";
  document.getElementById("registerButton").disabled = true;
  document.getElementById("registerButton").value = "Create Account";
  document.getElementById("strengthText").innerHTML = "";
}
