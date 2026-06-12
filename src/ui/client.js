const FILE = document.querySelector("main").dataset.file;

async function api(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

function showForm(afterEl, opts) {
  if (afterEl.nextElementSibling?.classList.contains("comment-form")) return;

  const form = document.createElement("div");
  form.className = "comment-form";
  form.innerHTML =
    '<textarea placeholder="输入评论..."></textarea>' +
    '<div class="form-actions">' +
    '<button class="btn-save">' +
    (opts.saveLabel || "添加") +
    "</button>" +
    '<button class="btn-cancel">取消</button></div>' +
    '<div class="form-error"></div>';

  afterEl.insertAdjacentElement("afterend", form);
  const ta = form.querySelector("textarea");
  ta.value = opts.initial || "";
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);

  form.querySelector(".btn-cancel").onclick = () => {
    if (opts.onCancel) opts.onCancel();
    form.remove();
  };
  form.querySelector(".btn-save").onclick = async () => {
    try {
      await opts.onSave(ta.value);
      location.reload();
    } catch (e) {
      form.querySelector(".form-error").textContent = e.errors
        ? e.errors.join("; ")
        : e.error || String(e);
    }
  };
}

function openEditForm(commentEl) {
  const id = commentEl.dataset.id;
  const bodyEl = commentEl.querySelector(".comment-body");
  const current = bodyEl.dataset.body;
  bodyEl.style.display = "none";
  showForm(commentEl.querySelector(".comment-header"), {
    initial: current,
    saveLabel: "保存",
    onSave: (body) => api("/api/comment/edit", { file: FILE, id, body }),
    onCancel: () => (bodyEl.style.display = ""),
  });
}

document.querySelectorAll(".btn-add-comment").forEach((btn) => {
  btn.addEventListener("click", () => {
    const block = btn.closest(".block");
    const existing = block.nextElementSibling;
    if (existing?.classList.contains("comment")) {
      openEditForm(existing);
      return;
    }
    const blockIndex = parseInt(btn.dataset.blockIndex);
    showForm(block, {
      onSave: (body) =>
        api("/api/comment/add", { file: FILE, blockIndex, body }),
    });
  });
});

document.querySelectorAll(".btn-edit").forEach((btn) => {
  btn.addEventListener("click", () => openEditForm(btn.closest(".comment")));
});

document.querySelectorAll(".btn-delete").forEach((btn) => {
  btn.addEventListener("click", async () => {
    await api("/api/comment/delete", { file: FILE, id: btn.dataset.id });
    location.reload();
  });
});

document.querySelectorAll(".status-select").forEach((sel) => {
  sel.addEventListener("change", async () => {
    await api("/api/comment/status", {
      file: FILE,
      id: sel.dataset.id,
      status: sel.value,
    });
    location.reload();
  });
});

document.getElementById("submit-btn").addEventListener("click", async () => {
  await fetch("/submit?file=" + encodeURIComponent(FILE), { method: "POST" });
  document.getElementById("submit-btn").textContent = "已提交";
  setTimeout(() => location.reload(), 500);
});

setInterval(async () => {
  try {
    const res = await fetch("/status?file=" + encodeURIComponent(FILE));
    const data = await res.json();
    const btn = document.getElementById("submit-btn");
    if (btn.textContent !== "已提交") {
      btn.textContent = data.waiters > 0 ? "提交" : "保存";
    }
  } catch {}
}, 2000);

document
  .querySelectorAll(".comment.collapsed .comment-header")
  .forEach((hdr) => {
    hdr.style.cursor = "pointer";
    hdr.addEventListener("click", (e) => {
      if (e.target.closest(".comment-actions")) return;
      hdr.closest(".comment").classList.toggle("collapsed");
    });
  });
