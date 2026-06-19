const complaintStorageKey = "campusCareComplaints";
let currentLocation = "";
let currentFileName = "";

// Local Storage helpers for complaint tickets.
function getComplaints() {
  return JSON.parse(localStorage.getItem(complaintStorageKey)) || [];
}

function saveComplaints(complaints) {
  localStorage.setItem(complaintStorageKey, JSON.stringify(complaints));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.innerText = value;
  }
}

function setError(id, message) {
  setText(id, message);
}

function clearStudentErrors() {
  setError("complaintTitleError", "");
  setError("complaintDescriptionError", "");
  setError("complaintFileError", "");
  setError("feedbackError", "");
}

// Prevents user-entered complaint text from being inserted as HTML.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidComplaintTitle(title) {
  return title.length >= 5;
}

function isValidComplaintDescription(description) {
  return description.length >= 20;
}

function isValidImageFile(file) {
  return file && file.type.startsWith("image/");
}

function isValidFeedback(feedback) {
  return feedback.length >= 10;
}

function normalizeSearchText(value) {
  return String(value).toLowerCase().replace(/[\s-]/g, "");
}

function filterComplaints(complaints) {
  const search = normalizeSearchText(document.getElementById("complaintSearch")?.value || "");
  const status = document.getElementById("complaintStatusFilter")?.value || "All";

  return complaints.filter(function (complaint) {
    const matchesStatus = status === "All" || complaint.status === status;
    const searchableText = normalizeSearchText(complaint.id + " " + complaint.title);
    const matchesSearch =
      !search ||
      searchableText.includes(search);

    return matchesStatus && matchesSearch;
  });
}

// Requires the user to login from index.html before using the portal.
function loadPortalUser() {
  const savedName = localStorage.getItem("studentName");

  if (!savedName) {
    window.location.href = "index.html";
    return;
  }

  setText("portalWelcome", "Welcome, " + savedName);
}

// Updates dashboard counts and rebuilds the recent complaints list.
function renderComplaints() {
  const complaints = getComplaints();
  const total = complaints.length;
  const pending = complaints.filter(function (complaint) {
    return complaint.status === "Pending";
  }).length;
  const inProgress = complaints.filter(function (complaint) {
    return complaint.status === "In Progress";
  }).length;
  const resolved = complaints.filter(function (complaint) {
    return complaint.status === "Resolved";
  }).length;

  //updates the dashboard numbers
  setText("totalCount", total);
  setText("pendingCount", pending);
  setText("progressCount", inProgress);
  setText("resolvedCount", resolved);
  renderDashboardExtras(complaints);

  const list = document.getElementById("complaintList");
  if (!list) return;

  const visibleComplaints = filterComplaints(complaints);

  if (complaints.length === 0) {
    list.innerHTML =
      '<p class="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No complaints submitted yet.</p>';
    return;
  }

  if (visibleComplaints.length === 0) {
    list.innerHTML =
      '<p class="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No matching complaints found.</p>';
    return;
  }

  list.innerHTML = visibleComplaints
    .map(function (complaint) {
      const statusClass =
        complaint.status === "Resolved"
          ? "bg-emerald-100 text-emerald-700"
          : complaint.status === "In Progress"
          ? "bg-sky-100 text-sky-700"
          : "bg-amber-100 text-amber-700";

      // Builds the HTML for each complaint ticket
      return (
        '<article class="rounded-2xl border border-slate-100 bg-slate-50 p-4">' +
        '<div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">' +
        "<div>" +
        '<p class="text-xs font-black uppercase text-sky-600">' +
        escapeHtml(complaint.id) +
        " - " +
        escapeHtml(complaint.category) +
        "</p>" +
        '<h3 class="mt-1 text-lg font-black">' +
        escapeHtml(complaint.title) +
        "</h3>" +
        '<p class="mt-2 text-sm text-slate-600">' +
        escapeHtml(complaint.description) +
        "</p>" +
        (complaint.adminRemark
          ? '<p class="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">Admin Remark: ' +
            escapeHtml(complaint.adminRemark) +
            "</p>"
          : "") +
        "</div>" +
        '<span class="rounded-full px-3 py-1 text-xs font-black ' +
        statusClass +
        '">' +
        escapeHtml(complaint.status) +
        "</span>" +
        "</div>" +
        '<div class="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">' +
        "<span>Priority: " +
        escapeHtml(complaint.priority) +
        "</span>" +
        "<span>" +
        escapeHtml(complaint.responseTime || "") +
        "</span>" +
        "<span>Submitted: " +
        escapeHtml(complaint.date) +
        "</span>" +
        (complaint.location ? "<span>Location added</span>" : "") +
        (complaint.fileName ? "<span>File: " + escapeHtml(complaint.fileName) + "</span>" : "") +
        "</div>" +
        "</article>"
      );
    })
    //combines all cards into one html string and dislpays in complaintList
    .join("");
}

// Geolocation API: gets current coordinates and prepares a Google Maps link.
function getLocation() {
  const result = document.getElementById("locationResult");
  const mapLink = document.getElementById("mapLink");

  if (!navigator.geolocation) {
    result.innerText = "Geolocation is not supported by this browser.";
    return;
  }

  result.innerText = "Detecting location...";

  navigator.geolocation.getCurrentPosition(
    function (position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      currentLocation = latitude + "," + longitude;
      result.innerText =
        "Latitude: " + latitude.toFixed(4) + ", Longitude: " + longitude.toFixed(4);

      mapLink.href = "https://www.google.com/maps?q=" + currentLocation;
      mapLink.classList.remove("hidden");
    },
    function () {
      result.innerText = "Location permission denied or unavailable.";
    }
  );
}

// File API: previews the selected proof image before submission.
function previewFile(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("filePreview");
  const removeBtn = document.getElementById("removeFileBtn");

  if (!file) return;

  setError("complaintFileError", "");

  if (!isValidImageFile(file)) {
    setError("complaintFileError", "Please upload only image files.");
    removeFile();
    return;
  }

  currentFileName = file.name;
  preview.src = URL.createObjectURL(file);
  preview.classList.remove("hidden");
  removeBtn.classList.remove("hidden");
}

function removeFile() {
  const input = document.getElementById("complaintFile");
  const preview = document.getElementById("filePreview");
  const removeBtn = document.getElementById("removeFileBtn");

  currentFileName = "";
  input.value = "";
  preview.src = "";
  preview.classList.add("hidden");
  removeBtn.classList.add("hidden");
}

// Web Notifications API: alerts the user after successful submission.
function showComplaintNotification(ticketId) {
  if (!("Notification" in window)) return;

  Notification.requestPermission().then(function (permission) {
    if (permission === "granted") {
      new Notification("CampusCare", {
        body: "Complaint " + ticketId + " submitted successfully."
      });
    }
  });
}

// Clipboard API: copies the generated ticket ID after submission.
function copyTicketId(ticketId) {
  if (!navigator.clipboard) {
    setText("submitResult", "Complaint submitted successfully! Ticket ID: " + ticketId);
    return;
  }

  navigator.clipboard
    .writeText(ticketId)
    .then(function () {
      setText(
        "submitResult",
        "Complaint submitted successfully! Ticket ID copied: " + ticketId
      );
    })
    .catch(function () {
      setText("submitResult", "Complaint submitted successfully! Ticket ID: " + ticketId);
    });
}

// Creates a new pending complaint and stores it in the browser.
function submitComplaint() {
  clearStudentErrors();

  const title = document.getElementById("complaintTitle").value.trim();
  const description = document.getElementById("complaintDescription").value.trim();
  const file = document.getElementById("complaintFile").files[0];
  let isValid = true;

  if (!title) {
    setError("complaintTitleError", "Complaint title is required.");
    isValid = false;
  } else if (!isValidComplaintTitle(title)) {
    setError("complaintTitleError", "Complaint title must be at least 5 characters.");
    isValid = false;
  }

  if (!description) {
    setError("complaintDescriptionError", "Complaint description is required.");
    isValid = false;
  } else if (!isValidComplaintDescription(description)) {
    setError("complaintDescriptionError", "Complaint description must be at least 20 characters.");
    isValid = false;
  }

  if (file && !isValidImageFile(file)) {
    setError("complaintFileError", "Please upload only image files.");
    isValid = false;
  }

  if (!isValid) {
    return;
  }

  const complaints = getComplaints();
  const ticketNumber = complaints.length + 1;
  const ticketId = "CC-2026-" + String(ticketNumber).padStart(3, "0");

  complaints.unshift({
    id: ticketId,
    title: title,
    category: document.getElementById("complaintCategory").value,
    priority: document.getElementById("complaintPriority").value,
    department: document.getElementById("assignedDepartment").innerText || "Not assigned",
    responseTime: document.getElementById("responseTime").innerText || "Not calculated",
    status: "Pending",
    description: description,
    location: currentLocation,
    fileName: currentFileName,
    date: new Date().toLocaleDateString()
  });

  saveComplaints(complaints);
  renderComplaints();
  clearComplaintForm();
  copyTicketId(ticketId);
  showComplaintNotification(ticketId);
}

function suggestPriority() {
  const category = document.getElementById("complaintCategory").value.toLowerCase();
  const title = document.getElementById("complaintTitle").value.trim();
  const description = document.getElementById("complaintDescription").value.trim();
  const priorityField = document.getElementById("complaintPriority");

  if (!title || !description) {
    setText("prioritySuggestion", "Please state the problem first.");
    setText("responseTime", "Enter complaint title and description to get a suggestion.");
    setText("assignedDepartment", "");
    setText("automationSummary", "");
    return;
  }

  const descriptionLower = description.toLowerCase();

  let priority = "Medium";
  let responseTime = "Expected response time: Within 2 working days";
  let department = "General Support";

  if (
    descriptionLower.includes("fire") ||
    descriptionLower.includes("spark") ||
    descriptionLower.includes("shock") ||
    descriptionLower.includes("broken wire") ||
    descriptionLower.includes("leakage")
  ) {
    priority = "High";
    responseTime = "Expected response time: Immediate attention required";
    department = "Maintenance / Safety Team";
  } else if (
  category.includes("wi-fi") ||
  category.includes("wifi") ||
  title.toLowerCase().includes("wi-fi") ||
  title.toLowerCase().includes("wifi") ||
  descriptionLower.includes("wi-fi") ||
  descriptionLower.includes("wifi") ||
  descriptionLower.includes("internet") ||
  descriptionLower.includes("network")
) {
    priority = "High";
    responseTime = "Expected response time: Within 24 hours";
    department = "IT Support Team";
  } else if (category.includes("laboratory")) {
    priority = "High";
    responseTime = "Expected response time: Within 24 hours";
    department = "Lab Support Team";
  } else if (category.includes("canteen")) {
    priority = "Medium";
    responseTime = "Expected response time: Within 2 working days";
    department = "Canteen Committee";
  } else if (category.includes("library")) {
    priority = "Medium";
    responseTime = "Expected response time: Within 2 working days";
    department = "Library Support Team";
  } else if (category.includes("transport")) {
    priority = "Medium";
    responseTime = "Expected response time: Within 2 working days";
    department = "Transport Office";
  } else {
    priority = "Low";
    responseTime = "Expected response time: Within 3 to 5 working days";
    department = "Campus Support Team";
  }

  priorityField.value = priority;
  setText("prioritySuggestion", "Suggested Priority: " + priority);
  setText("responseTime", responseTime);
  setText("assignedDepartment", "Assigned Department: " + department);
}

function clearComplaintForm() {
  document.getElementById("complaintTitle").value = "";
  document.getElementById("complaintDescription").value = "";
  document.getElementById("complaintPriority").value = "Medium";

  document.getElementById("locationResult").innerText = "";
  document.getElementById("mapLink").classList.add("hidden");
  clearStudentErrors();

  // Reset Smart Automation Section
  setText("prioritySuggestion", "Click 'Suggest Priority' after entering a complaint.");
  setText("responseTime", "");
  setText("assignedDepartment", "");
  setText("automationSummary", "");

  currentLocation = "";

  removeFile();
}

function clearComplaints() {
  localStorage.removeItem(complaintStorageKey);
  setText("submitResult", "");
  renderComplaints();
}

// Fullscreen API: expands the dashboard section.
function openFullscreen() {
  const dashboard = document.getElementById("dashboardBox");

  if (dashboard.requestFullscreen) {
    dashboard.requestFullscreen();
  } else if (dashboard.webkitRequestFullscreen) {
    dashboard.webkitRequestFullscreen();
  } else if (dashboard.msRequestFullscreen) {
    dashboard.msRequestFullscreen();
  }
}

function renderDashboardExtras(complaints) {
  const latestTicket = document.getElementById("latestTicket");
  const latestDetails = document.getElementById("latestDetails");
  const latestRemark = document.getElementById("latestRemark");

  if (!latestTicket || !latestDetails) return;

  if (complaints.length === 0) {
    latestTicket.innerText = "No ticket yet";
    latestDetails.innerText = "Submit a complaint to view latest ticket details.";
    if (latestRemark) latestRemark.innerText = "";
    updateTimeline("");
    return;
  }

  const latest = complaints[0];

  latestTicket.innerText = latest.id;
  latestDetails.innerText =
    latest.category + " | " + latest.priority + " Priority | " + latest.status;
  if (latestRemark) {
    latestRemark.innerText = latest.adminRemark ? "Admin Remark: " + latest.adminRemark : "";
  }

  updateTimeline(latest.status);

  if (latest.rating) {
    setText(
      "feedbackResult",
      "Saved Feedback: " + latest.rating + " stars - " + latest.feedback
    );
  } else {
    setText("feedbackResult", "");
  }
}

function updateTimeline(status) {
  const steps = ["stepPending", "stepProgress", "stepResolved", "stepFeedback"];
  const timelineStatusText = document.getElementById("timelineStatusText");

  steps.forEach(function (id) {
    const step = document.getElementById(id);
    if (step) {
      step.className = "rounded-xl bg-white/10 p-3 text-center";
    }
  });

  if (status === "Pending") {
    document.getElementById("stepPending")?.classList.add("bg-amber-400", "text-[#14213d]");
    if (timelineStatusText) {
      timelineStatusText.innerText = "Your complaint has been submitted and is waiting for admin review.";
    }
  }

  if (status === "In Progress") {
    document.getElementById("stepPending")?.classList.add("bg-emerald-400", "text-[#14213d]");
    document.getElementById("stepProgress")?.classList.add("bg-amber-400", "text-[#14213d]");
    if (timelineStatusText) {
      timelineStatusText.innerText = "Admin has started working on this complaint.";
    }
  }

  if (status === "Resolved") {
    document.getElementById("stepPending")?.classList.add("bg-emerald-400", "text-[#14213d]");
    document.getElementById("stepProgress")?.classList.add("bg-emerald-400", "text-[#14213d]");
    document.getElementById("stepResolved")?.classList.add("bg-emerald-400", "text-[#14213d]");
    document.getElementById("stepFeedback")?.classList.add("bg-sky-400", "text-[#14213d]");
    if (timelineStatusText) {
      timelineStatusText.innerText = "The complaint is resolved. You can now submit feedback.";
    }
  }

  if (!status && timelineStatusText) {
    timelineStatusText.innerText = "Submit a complaint to start the timeline.";
  }
}

function submitFeedback() {
  setError("feedbackError", "");
  const complaints = getComplaints();

  if (complaints.length === 0) {
    setError("feedbackError", "Submit a complaint first.");
    return;
  }

  const latest = complaints[0];

  if (latest.status !== "Resolved") {
    setError("feedbackError", "Feedback can be submitted only after the complaint is resolved.");
    return;
  }

  const rating = document.getElementById("ratingValue").value;
  const feedback = document.getElementById("feedbackText").value.trim();

  if (!rating || !feedback) {
    setError("feedbackError", "Please select rating and enter feedback.");
    return;
  }

  if (!isValidFeedback(feedback)) {
    setError("feedbackError", "Feedback must be at least 10 characters.");
    return;
  }

  latest.rating = rating;
  latest.feedback = feedback;

  complaints[0] = latest;
  saveComplaints(complaints);

  setText("feedbackResult", "Feedback submitted successfully. Thank you!");
  setError("feedbackError", "");
  document.getElementById("ratingValue").value = "";
  document.getElementById("feedbackText").value = "";

  renderComplaints();
}

// Load saved user and complaint data when the portal opens.
window.addEventListener("load", function () {
  if (document.getElementById("portalWelcome")) {
    loadPortalUser();
    renderComplaints();
  }
});
