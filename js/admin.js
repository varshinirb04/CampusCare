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

  const complaints = getComplaints();

  if (complaints.length === 0) {
    list.innerHTML =
      '<p class="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No complaints available.</p>';
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

          </div>

        </article>
      `;
    })
    .join("");
}

// Update complaint status
function updateComplaintStatus(id, newStatus) {
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