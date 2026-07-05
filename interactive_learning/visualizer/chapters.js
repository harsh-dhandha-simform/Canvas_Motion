// Self-contained page for the hardcoded tests/hardcore.md chapters.
// Deliberately NOT sharing script.js - that file's init code
// (setupTabs/renderArrangeSteps/...) runs unconditionally on load and is
// wired to the main demo's specific DOM ids, so including it here would
// error immediately. Duplicating this much smaller subset (arrange_steps +
// scenario_based only - no build_it_yourself/match_items needed for these
// chapters) keeps the original visualizer completely untouched, per
// instruction not to change anything already built.

const BOX_WIDTH = 120;
const BOX_HEIGHT = 44;

const API_BASE = new URLSearchParams(location.search).get("api_base") || "http://localhost:8080";
// Never hardcode the key here. Comes from config.local.js (gitignored - see
// config.example.js) or a ?api_key= override.
const API_KEY = window.__API_KEY__ || new URLSearchParams(location.search).get("api_key") || "";
if (!API_KEY) {
  console.warn("No API key set - copy config.example.js to config.local.js and fill it in, or pass ?api_key=...");
}

document.getElementById("api-base-label").textContent = API_BASE;

async function apiPost(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  return response.json();
}

function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(`panel-${button.dataset.tab}`).classList.add("active");
    });
  });
}

// -----------------------------------------------------------------------
// Shared "Check Answer" / "Get Hint" wiring (same behavior as script.js)
// -----------------------------------------------------------------------

function renderActions(challengeId, actionsEl, resultEl, getUserAttempt) {
  actionsEl.innerHTML = "";
  resultEl.innerHTML = "";

  const checkBtn = document.createElement("button");
  checkBtn.className = "action-button";
  checkBtn.textContent = "Check Answer";
  actionsEl.appendChild(checkBtn);

  const statusEl = document.createElement("div");
  statusEl.className = "status-line";
  actionsEl.appendChild(statusEl);

  checkBtn.addEventListener("click", async () => {
    const userAttempt = getUserAttempt();

    if (!userAttempt) {
      statusEl.textContent = "Finish your attempt first.";
      statusEl.classList.add("error");
      return;
    }

    checkBtn.disabled = true;
    statusEl.classList.remove("error");
    statusEl.textContent = "Checking...";

    try {
      const data = await apiPost("/validate", { challenge_id: challengeId, user_attempt: userAttempt });
      if (!data.success) throw new Error(data.error || "validation failed");

      statusEl.textContent = "";
      renderResult(resultEl, data.result, challengeId);
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.classList.add("error");
    } finally {
      checkBtn.disabled = false;
    }
  });
}

function renderResult(resultEl, result, challengeId) {
  const statusHtml = result.correct
    ? `<span class="correct-text">Correct</span>`
    : `<span class="wrong-text">Incorrect</span>`;

  resultEl.innerHTML = `<div class="score-line">${statusHtml} &middot; score: ${result.score}</div>`;

  if (Object.keys(result.mistakes).length > 0) {
    resultEl.insertAdjacentHTML("beforeend", `<pre>${JSON.stringify(result.mistakes, null, 2)}</pre>`);
  }

  if (result.correct) {
    resultEl.insertAdjacentHTML(
      "beforeend",
      `<div class="hint">Great job! You correctly completed the challenge.</div>`
    );
    return;
  }

  const hintBtn = document.createElement("button");
  hintBtn.className = "action-button secondary";
  hintBtn.textContent = "Get Hint";
  resultEl.appendChild(hintBtn);

  hintBtn.addEventListener("click", async () => {
    hintBtn.disabled = true;
    hintBtn.textContent = "Thinking...";

    try {
      const data = await apiPost("/hint", { challenge_id: challengeId, mistakes: result.mistakes });
      if (!data.success) throw new Error(data.error || "hint failed");

      resultEl.insertAdjacentHTML("beforeend", `<div class="hint">Hint: ${data.hint}</div>`);
      hintBtn.remove();
    } catch (err) {
      hintBtn.disabled = false;
      hintBtn.textContent = "Get Hint";
      resultEl.insertAdjacentHTML("beforeend", `<div class="status-line error">Error: ${err.message}</div>`);
    }
  });
}

// -----------------------------------------------------------------------
// arrange_steps - drag to reorder (swap-on-drop), same behavior as script.js
// -----------------------------------------------------------------------

function renderArrangeSteps(challenge, vizEl, actionsEl, resultEl) {
  const labelById = {};
  challenge.data.steps.forEach((s) => (labelById[s.id] = s.label));

  const order = shuffle(challenge.data.steps.map((s) => s.id));

  const gap = 20;
  const y = 40;
  const slotX = (i) => 20 + i * (BOX_WIDTH + gap);
  const width = order.length * (BOX_WIDTH + gap) + 20;
  const height = 120;

  function draw() {
    vizEl.innerHTML = "";
    const svg = d3.select(vizEl).append("svg").attr("width", width).attr("height", height);

    const groups = svg
      .selectAll("g.step-item")
      .data(order, (d) => d)
      .join("g")
      .attr("class", "step-item")
      .attr("transform", (d, i) => `translate(${slotX(i)}, ${y})`);

    groups
      .append("rect")
      .attr("class", "step-box correct")
      .attr("width", BOX_WIDTH)
      .attr("height", BOX_HEIGHT)
      .attr("rx", 8);

    groups
      .append("text")
      .attr("class", "step-label")
      .attr("x", BOX_WIDTH / 2)
      .attr("y", BOX_HEIGHT / 2)
      .text((d) => labelById[d]);

    groups.call(
      d3
        .drag()
        .on("start", function () {
          d3.select(this).raise();
          this.__dx = 0;
        })
        .on("drag", function (event, d) {
          this.__dx += event.dx;
          const i = order.indexOf(d);
          d3.select(this).attr("transform", `translate(${slotX(i) + this.__dx}, ${y})`);
        })
        .on("end", function (event, d) {
          const i = order.indexOf(d);
          const finalCenter = slotX(i) + this.__dx + BOX_WIDTH / 2;

          let nearest = i;
          let nearestDist = Infinity;
          order.forEach((_, j) => {
            const dist = Math.abs(slotX(j) + BOX_WIDTH / 2 - finalCenter);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = j;
            }
          });

          if (nearest !== i) {
            [order[i], order[nearest]] = [order[nearest], order[i]];
          }

          draw();
        })
    );
  }

  draw();

  renderActions(challenge.challenge_id, actionsEl, resultEl, () => ({
    challenge_id: challenge.challenge_id,
    ordered_ids: order,
  }));
}

// -----------------------------------------------------------------------
// scenario_based - click to select one option, same behavior as script.js
// -----------------------------------------------------------------------

function renderScenarioBased(challenge, vizEl, actionsEl, resultEl) {
  const options = challenge.data.options;
  const width = 560;
  const optionHeight = 46;
  const gap = 12;
  const textHeight = 50;
  const height = textHeight + options.length * (optionHeight + gap) + 10;

  vizEl.innerHTML = "";
  const svg = d3.select(vizEl).append("svg").attr("width", width).attr("height", height);

  svg
    .append("text")
    .attr("class", "scenario-text")
    .attr("x", 10)
    .attr("y", 24)
    .text(challenge.data.scenario);

  let selected = null;

  const groups = svg
    .selectAll("g.option")
    .data(options, (o) => o.id)
    .join("g")
    .attr("class", "option")
    .attr("transform", (o, i) => `translate(10, ${textHeight + i * (optionHeight + gap)})`);

  groups
    .append("rect")
    .attr("class", "option-card")
    .attr("width", width - 20)
    .attr("height", optionHeight)
    .attr("rx", 8);

  groups
    .append("text")
    .attr("class", "option-label")
    .attr("x", 16)
    .attr("y", optionHeight / 2)
    .attr("text-anchor", "start")
    .text((o) => o.label);

  groups.on("click", function (event, o) {
    selected = o.id;
    groups.select("rect").classed("selected", (d) => d.id === selected);
  });

  renderActions(challenge.challenge_id, actionsEl, resultEl, () =>
    selected ? { challenge_id: challenge.challenge_id, selected_option: selected } : null
  );
}

// -----------------------------------------------------------------------
// Build the page from CHAPTERS_DATA (interactive_learning/chapters.py)
// -----------------------------------------------------------------------

function renderChapter(chapter) {
  const root = document.getElementById("chapters-root");

  const panel = document.createElement("section");
  panel.id = `panel-chapter-${chapter.chapter}`;
  panel.className = "panel" + (chapter.chapter === 1 ? " active" : "");
  root.appendChild(panel);

  const heading = document.createElement("h2");
  heading.textContent = chapter.title;
  panel.appendChild(heading);

  chapter.challenges.forEach((challenge) => {
    const section = document.createElement("div");
    section.className = "chapter-challenge";

    const title = document.createElement("h3");
    title.textContent = challenge.title;
    section.appendChild(title);

    const description = document.createElement("p");
    description.className = "challenge-subtitle";
    description.textContent = challenge.description;
    section.appendChild(description);

    const instructions = document.createElement("p");
    instructions.className = "instructions";
    instructions.textContent =
      challenge.challenge_type === "arrange_steps"
        ? "Drag the steps into the order you think is correct."
        : "Read the scenario, then click the option you think fits best.";
    section.appendChild(instructions);

    const viz = document.createElement("div");
    viz.className = "viz";
    section.appendChild(viz);

    const actions = document.createElement("div");
    actions.className = "actions";
    section.appendChild(actions);

    const result = document.createElement("div");
    result.className = "result";
    section.appendChild(result);

    panel.appendChild(section);

    if (challenge.challenge_type === "arrange_steps") {
      renderArrangeSteps(challenge, viz, actions, result);
    } else {
      renderScenarioBased(challenge, viz, actions, result);
    }
  });
}

setupTabs();
CHAPTERS_DATA.forEach(renderChapter);
