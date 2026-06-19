// Protect admin page
function protectAdminPage() {
  if (localStorage.getItem("activeRole") !== "admin") {
    window.location.href = "index.html";
  }
}

// Render all complaints for admin
function renderAdminComplaints() {
  const list = document.getElementById("adminComplaintList");

  if (!list) return;

  const allComplaints = getComplaints();
  const complaints = filterAdminComplaints(allComplaints);
  renderAdminSummary(allComplaints);

  if (complaints.length === 0) {
    list.innerHTML =
      '<p class="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No matching complaints found.</p>';
    return;
  }

  list.innerHTML = complaints
    .map(function (complaint) {
      return `
        <article class="rounded-2xl border border-slate-100 bg-slate-50 p-5">
          
          <div class="flex flex-col gap-2">
            <p class="text-xs font-black uppercase text-sky-600">
              ${escapeHtml(complaint.id)} - ${escapeHtml(complaint.category)}
            </p>

            <h3 class="text-xl font-black">
              ${escapeHtml(complaint.title)}
            </h3>

            <p class="text-sm text-slate-600">
              ${escapeHtml(complaint.description)}
            </p>

            <div class="flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
              <span>Priority: ${escapeHtml(complaint.priority)}</span>
              <span>Status: ${escapeHtml(complaint.status)}</span>
              <span>Date: ${escapeHtml(complaint.date)}</span>
            </div>

            ${
              complaint.adminRemark
                ? `
                <p class="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                  Admin Remark: ${escapeHtml(complaint.adminRemark)}
                </p>
              `
                : ""
            }

            ${
              complaint.rating && complaint.feedback
                ? `
                <div class="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                  <p>Student Feedback: ${escapeHtml(complaint.rating)} / 5 stars</p>
                  <p class="mt-1">${escapeHtml(complaint.feedback)}</p>
                </div>
              `
                : `
                <p class="rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-500">
                  Student feedback not submitted yet.
                </p>
              `
            }

            ${
              complaint.location
                ? `
                <a
                  href="https://www.google.com/maps?q=${complaint.location}"
                  target="_blank"
                  class="mt-2 inline-block text-sm font-bold text-sky-600 hover:underline"
                >
                  View Location
                </a>
              `
                : ""
            }

            ${
              complaint.fileName
                ? `
                <p class="text-sm font-semibold text-emerald-600">
                  Proof Attached: ${escapeHtml(complaint.fileName)}
                </p>
              `
                : ""
            }

            <div class="mt-4">
              <label class="block text-sm font-black">
                Update Status
              </label>

              <select
                onchange="updateComplaintStatus('${complaint.id}', this.value)"
                class="mt-2 rounded-xl border border-slate-200 px-4 py-3"
              >
                <option ${
                  complaint.status === "Pending" ? "selected" : ""
                }>
                  Pending
                </option>

                <option ${
                  complaint.status === "In Progress" ? "selected" : ""
                }>
                  In Progress
                </option>

                <option ${
                  complaint.status === "Resolved" ? "selected" : ""
                }>
                  Resolved
                </option>
              </select>
            </div>

            <div class="mt-4">
              <label class="block text-sm font-black">
                Admin Remark
              </label>

              <textarea
                id="remark-${complaint.id}"
                rows="2"
                placeholder="Example: Assigned to IT team"
                class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
              >${escapeHtml(complaint.adminRemark || "")}</textarea>

              <button
                type="button"
                onclick="saveAdminRemark('${complaint.id}')"
                class="mt-3 rounded-xl bg-sky-500 px-5 py-2 font-black text-white hover:bg-sky-600"
              >
                Save Remark
              </button>

              <p id="remarkError-${complaint.id}" class="mt-2 text-sm font-bold text-rose-600"></p>
            </div>

          </div>

        </article>
      `;
    })
    .join("");
}

function renderAdminSummary(complaints) {
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
  const feedback = complaints.filter(function (complaint) {
    return complaint.rating && complaint.feedback;
  }).length;

  setText("adminTotalCount", total);
  setText("adminPendingCount", pending);
  setText("adminProgressCount", inProgress);
  setText("adminResolvedCount", resolved);
  setText("adminFeedbackCount", feedback);
}

function filterAdminComplaints(complaints) {
  const search = normalizeSearchText(document.getElementById("adminSearch")?.value || "");
  const status = document.getElementById("adminStatusFilter")?.value || "All";

  return complaints.filter(function (complaint) {
    const matchesStatus = status === "All" || complaint.status === status;
    const searchableText = normalizeSearchText(complaint.id + " " + complaint.title);
    const matchesSearch =
      !search ||
      searchableText.includes(search);

    return matchesStatus && matchesSearch;
  });
}

// Update complaint status
function updateComplaintStatus(id, newStatus) {
  const allowedStatuses = ["Pending", "In Progress", "Resolved"];
  if (!allowedStatuses.includes(newStatus)) return;

  const complaints = getComplaints();

  const updatedComplaints = complaints.map(function (complaint) {
    if (complaint.id === id) {
      complaint.status = newStatus;
    }

    return complaint;
  });

  saveComplaints(updatedComplaints);

  renderAdminComplaints();
}

function saveAdminRemark(id) {
  const remarkInput = document.getElementById("remark-" + id);
  const error = document.getElementById("remarkError-" + id);
  const remark = remarkInput.value.trim();

  if (error) error.innerText = "";

  if (remark.length < 5) {
    if (error) error.innerText = "Remark must be at least 5 characters.";
    return;
  }

  const complaints = getComplaints();
  const updatedComplaints = complaints.map(function (complaint) {
    if (complaint.id === id) {
      complaint.adminRemark = remark;
    }

    return complaint;
  });

  saveComplaints(updatedComplaints);
  renderAdminComplaints();
}

// Logout admin
function logout() {
  localStorage.removeItem("activeRole");

  window.location.href = "index.html";
}

// Initialize admin page
window.addEventListener("load", function () {
  protectAdminPage();
  renderAdminComplaints();
});
