
let users = [
  { id: "U-001", name: "Araf Abdullah", username: "admin", password: "admin1234", email: "admin@tourbd.com", phone: "01700000001", role: "Admin", status: "Active" },
  {
    id: "U-002", name: "Manager", username: "manager", password: "manager1234", email: "manager@tourbd.com", phone: "01700000002", role: "Agency Manager", status: "Active",
    employeeId: "EMP-2001", branch: "Dhaka", designation: "Operations Manager"
  },
  {
    id: "U-003", name: "Guide", username: "guide", password: "guide1234", email: "guide@tourbd.com", phone: "01700000003", role: "Tour Guide", status: "Active",
    licenseNo: "GL-3001", languages: ["Bangla", "English"], experience: 5, expertise: "Beach"
  },
  {
    id: "U-004", name: "Tourist", username: "tourist", password: "tourist1234", email: "tourist@tourbd.com", phone: "017000000004", role: "Tourist", status: "Active",
    nid: "46500000001111", nationality: "Bangladeshi", interests: []
  }
];

// ---------- packages ----------
let packages = [];


// ---------- bookings ----------
let bookings = [];


// ---------- payments ----------
let payments = [];


// ---------- reviews ----------
let reviews = [];


// ---------- specialRequests ----------
let specialRequests = [];


// ---------- notices ----------
let notices = [];


// ---------- routeChanges ----------
let routeChanges = [];


// ---------- vehicles ----------
let vehicles = [];


// ---------- vehicleBookings ----------
let vehicleBookings = [];


// ---------- actionLog ----------
let actionLog = [];
