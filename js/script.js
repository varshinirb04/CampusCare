const complaintStorageKey = "campusCareComplaints";
let currentLocation = "";
let currentFileName = "";

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loadPortalUser() {
  const savedName = localStorage.getItem("studentName");

  if (!savedName) {
    window.location.href = "index.html";
    return;
  }

  setText("portalWelcome", "Welcome, " + savedName);
}

function renderComplaints() {
  const complaints = getComplaints();
  const total = complaints.length;
  const pending = complaints.filter(function (complaint) {
    return complaint.status === "Pending";
  }).length;
  const resolved = complaints.filter(function (complaint) {
    return complaint.status === "Resolved";
  }).length;

  setText("totalCount", total);
  setText("pendingCount", pending);
  setText("resolvedCount", resolved);

  const list = document.getElementById("complaintList");
  if (!list) return;

  if (complaints.length === 0) {
    list.innerHTML =
      '<p class="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No complaints submitted yet.</p>';
    return;
  }

  list.innerHTML = complaints
    .map(function (complaint) {
      const statusClass =
        complaint.status === "Resolved"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700";

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
        "<span>Submitted: " +
        escapeHtml(complaint.date) +
        "</span>" +
        (complaint.location ? "<span>Location added</span>" : "") +
        (complaint.fileName ? "<span>File: " + escapeHtml(complaint.fileName) + "</span>" : "") +
        "</div>" +
        "</article>"
      );
    })
    .join("");
}

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

function previewFile(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("filePreview");
  const removeBtn = document.getElementById("removeFileBtn");

  if (!file) return;

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

function submitComplaint() {
  const title = document.getElementById("complaintTitle").value.trim();
  const description = document.getElementById("complaintDescription").value.trim();

  if (!title || !description) {
    alert("Please enter complaint title and description.");
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

function clearComplaintForm() {
  document.getElementById("complaintTitle").value = "";
  document.getElementById("complaintDescription").value = "";
  document.getElementById("complaintPriority").value = "Medium";
  document.getElementById("locationResult").innerText = "";
  document.getElementById("mapLink").classList.add("hidden");
  currentLocation = "";
  removeFile();
}

function clearComplaints() {
  localStorage.removeItem(complaintStorageKey);
  setText("submitResult", "");
  renderComplaints();
}

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

window.addEventListener("load", function () {
  loadPortalUser();
  renderComplaints();
});
