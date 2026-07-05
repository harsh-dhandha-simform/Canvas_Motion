// Renders VISUALIZER_DATA (challenge-only, no ground truth - see
// generate_visualizer_data.py) and lets the user actually attempt each
// challenge via drag/click, then checks it against claude_api.py's live
// /validate and /hint routes. Ground truth never appears in this file.

const BOX_WIDTH = 120;
const BOX_HEIGHT = 44;

const API_BASE = new URLSearchParams(location.search).get("api_base") || "http://localhost:8080";
// Never hardcode the key here. Comes from config.local.js (gitignored - see
// config.example.js) or a ?api_key= override. This bridge has no real
// end-user auth story yet - fine for local use, not for deploying this page
// anywhere untrusted.
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

// Draws a directed connection as an arrow: the arrowhead marks the "to" end,
// so the user can see which direction was actually recorded (matters since
// validation compares connections/matches as exact [from, to] pairs, not
// direction-insensitively).
// markerId must be unique per <svg> - all 5 challenge panels render at once
// (hidden via CSS, not removed from the DOM), so a shared literal id like
// "arrowhead" collides document-wide and url(#arrowhead) can resolve to the
// wrong panel's marker (or fail to render at all) across separate <svg> roots.
function addArrowheadMarker(svg, markerId) {
  svg
    .append("defs")
    .append("marker")
    .attr("id", markerId)
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 8)
    .attr("refY", 5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr("class", "arrowhead-fill")
    .attr("d", "M 0 0 L 10 5 L 0 10 z");
}

// Pulls the line's endpoint back to just outside the target box's actual
// boundary (not a flat margin - a flat margin smaller than the box's
// half-width leaves the arrowhead rendered *inside* the box, where it gets
// painted over since nodes draw on top of edges. Boxes are BOX_WIDTH wide
// and BOX_HEIGHT tall, so the clearance needed depends on the approach
// angle: near-horizontal approaches need ~BOX_WIDTH/2, near-vertical ones
// need ~BOX_HEIGHT/2).
function trimLineEnd(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { x: to.x, y: to.y };

  const halfWidth = BOX_WIDTH / 2;
  const halfHeight = BOX_HEIGHT / 2;
  const ux = Math.abs(dx / dist);
  const uy = Math.abs(dy / dist);

  const boundaryDistance = 1 / Math.max(ux / halfWidth, uy / halfHeight);
  const margin = boundaryDistance + 6; // small buffer past the box border/stroke

  if (dist <= margin) return { x: from.x, y: from.y };

  const ratio = (dist - margin) / dist;
  return { x: from.x + dx * ratio, y: from.y + dy * ratio };
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
// Shared "Check Answer" / "Get Hint" wiring
// -----------------------------------------------------------------------

function renderActions(challengeType, actionsContainerId, resultContainerId, getUserAttempt) {
  const actionsEl = document.getElementById(actionsContainerId);
  actionsEl.innerHTML = "";
  document.getElementById(resultContainerId).innerHTML = "";

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
      const challengeId = VISUALIZER_DATA[challengeType].challenge_id;
      const data = await apiPost("/validate", { challenge_id: challengeId, user_attempt: userAttempt });

      if (!data.success) throw new Error(data.error || "validation failed");

      statusEl.textContent = "";
      renderResult(resultContainerId, data.result, challengeId);
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.classList.add("error");
    } finally {
      checkBtn.disabled = false;
    }
  });
}

function renderResult(containerId, result, challengeId) {
  const el = document.getElementById(containerId);
  const statusHtml = result.correct
    ? `<span class="correct-text">Correct</span>`
    : `<span class="wrong-text">Incorrect</span>`;

  el.innerHTML = `<div class="score-line">${statusHtml} &middot; score: ${result.score}</div>`;

  if (Object.keys(result.mistakes).length > 0) {
    el.insertAdjacentHTML("beforeend", `<pre>${JSON.stringify(result.mistakes, null, 2)}</pre>`);
  }

  if (result.correct) {
    el.insertAdjacentHTML(
      "beforeend",
      `<div class="hint">Great job! You correctly completed the challenge.</div>`
    );
    return;
  }

  const hintBtn = document.createElement("button");
  hintBtn.className = "action-button secondary";
  hintBtn.textContent = "Get Hint";
  el.appendChild(hintBtn);

  hintBtn.addEventListener("click", async () => {
    hintBtn.disabled = true;
    hintBtn.textContent = "Thinking...";

    try {
      const data = await apiPost("/hint", { challenge_id: challengeId, mistakes: result.mistakes });
      if (!data.success) throw new Error(data.error || "hint failed");

      el.insertAdjacentHTML("beforeend", `<div class="hint">Hint: ${data.hint}</div>`);
      hintBtn.remove();
    } catch (err) {
      hintBtn.disabled = false;
      hintBtn.textContent = "Get Hint";
      el.insertAdjacentHTML("beforeend", `<div class="status-line error">Error: ${err.message}</div>`);
    }
  });
}

// -----------------------------------------------------------------------
// arrange_steps - drag to reorder (swap-on-drop)
// -----------------------------------------------------------------------

function renderArrangeSteps() {
  const challenge = VISUALIZER_DATA.arrange_steps;
  document.getElementById("arrange_steps-title").textContent = challenge.title;
  document.getElementById("arrange_steps-description").textContent = challenge.description;

  const labelById = {};
  challenge.data.steps.forEach((s) => (labelById[s.id] = s.label));

  const order = shuffle(challenge.data.steps.map((s) => s.id));

  const gap = 20;
  const y = 40;
  const slotX = (i) => 20 + i * (BOX_WIDTH + gap);
  const width = order.length * (BOX_WIDTH + gap) + 20;
  const height = 120;

  const container = document.getElementById("arrange_steps-viz");

  function draw() {
    container.innerHTML = "";
    const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);

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

  renderActions("arrange_steps", "arrange_steps-actions", "arrange_steps-result", () => ({
    challenge_id: challenge.challenge_id,
    ordered_ids: order,
  }));
}

// -----------------------------------------------------------------------
// build_it_yourself - drag a wire from a node's port to another node
// -----------------------------------------------------------------------

function renderBuildItYourself() {
  const challenge = VISUALIZER_DATA.build_it_yourself;
  document.getElementById("build_it_yourself-title").textContent = challenge.title;
  document.getElementById("build_it_yourself-description").textContent = challenge.description;

  const components = challenge.data.components;
  const width = 600;
  const height = 320;
  const radius = 110;
  const centerX = width / 2;
  const centerY = height / 2 - 10;

  const positions = {};
  components.forEach((c, i) => {
    const angle = (i / components.length) * Math.PI * 2 - Math.PI / 2;
    positions[c.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const connections = [];
  const container = document.getElementById("build_it_yourself-viz");

  function draw() {
    container.innerHTML = "";
    const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
    addArrowheadMarker(svg, "arrowhead-build");
    const edgeGroup = svg.append("g");
    const nodeGroup = svg.append("g");

    function drawEdges() {
      edgeGroup.selectAll("line").remove();
      connections.forEach(([from, to], idx) => {
        const end = trimLineEnd(positions[from], positions[to]);
        edgeGroup
          .append("line")
          .attr("class", "link-line user")
          .attr("x1", positions[from].x)
          .attr("y1", positions[from].y)
          .attr("x2", end.x)
          .attr("y2", end.y)
          .attr("marker-end", "url(#arrowhead-build)")
          .on("click", () => {
            connections.splice(idx, 1);
            drawEdges();
          });
      });
    }
    drawEdges();

    const nodes = nodeGroup
      .selectAll("g.node")
      .data(components, (c) => c.id)
      .join("g")
      .attr("class", "node")
      .attr("transform", (c) => `translate(${positions[c.id].x}, ${positions[c.id].y})`);

    nodes
      .append("rect")
      .attr("class", "node-box correct")
      .attr("x", -BOX_WIDTH / 2)
      .attr("y", -BOX_HEIGHT / 2)
      .attr("width", BOX_WIDTH)
      .attr("height", BOX_HEIGHT)
      .attr("rx", 8);

    nodes.append("text").attr("class", "node-label").text((c) => c.label);

    nodes
      .append("circle")
      .attr("class", "node-port")
      .attr("cx", BOX_WIDTH / 2 - 8)
      .attr("cy", BOX_HEIGHT / 2 - 8)
      .attr("r", 6)
      .datum((c) => c.id)
      .call(
        d3
          .drag()
          .on("start", function (event, id) {
            this.__sourceId = id;
            this.__temp = svg
              .append("line")
              .attr("class", "link-line pending")
              .attr("marker-end", "url(#arrowhead-build)")
              .attr("x1", positions[id].x)
              .attr("y1", positions[id].y)
              .attr("x2", positions[id].x)
              .attr("y2", positions[id].y);
          })
          .on("drag", function (event) {
            const [x, y] = d3.pointer(event, svg.node());
            this.__temp.attr("x2", x).attr("y2", y);
          })
          .on("end", function (event) {
            const [x, y] = d3.pointer(event, svg.node());
            this.__temp.remove();

            let targetId = null;
            for (const c of components) {
              if (c.id === this.__sourceId) continue;
              const pos = positions[c.id];
              if (Math.abs(x - pos.x) < BOX_WIDTH / 2 && Math.abs(y - pos.y) < BOX_HEIGHT / 2) {
                targetId = c.id;
                break;
              }
            }

            if (targetId) {
              const alreadyExists = connections.some(
                ([from, to]) => from === this.__sourceId && to === targetId
              );
              if (!alreadyExists) connections.push([this.__sourceId, targetId]);
              draw();
            }
          })
      );
  }

  draw();

  renderActions("build_it_yourself", "build_it_yourself-actions", "build_it_yourself-result", () => ({
    challenge_id: challenge.challenge_id,
    connections,
  }));
}

// -----------------------------------------------------------------------
// scenario_based / multiple_choice - click to select one option
// -----------------------------------------------------------------------

function renderOptionSelect(challengeType, textField) {
  const challenge = VISUALIZER_DATA[challengeType];
  document.getElementById(`${challengeType}-title`).textContent = challenge.title;
  document.getElementById(`${challengeType}-description`).textContent = challenge.description;

  const options = challenge.data.options;
  const width = 560;
  const optionHeight = 46;
  const gap = 12;
  const textHeight = 50;
  const height = textHeight + options.length * (optionHeight + gap) + 10;

  const container = document.getElementById(`${challengeType}-viz`);
  container.innerHTML = "";
  const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);

  svg
    .append("text")
    .attr("class", challengeType === "scenario_based" ? "scenario-text" : "question-text")
    .attr("x", 10)
    .attr("y", 24)
    .text(challenge.data[textField]);

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

  renderActions(challengeType, `${challengeType}-actions`, `${challengeType}-result`, () =>
    selected ? { challenge_id: challenge.challenge_id, selected_option: selected } : null
  );
}

// -----------------------------------------------------------------------
// match_items - drag a wire from a left item's port to a right item
// (constrained: each left item may have at most one outgoing match)
// -----------------------------------------------------------------------

function renderMatchItems() {
  const challenge = VISUALIZER_DATA.match_items;
  document.getElementById("match_items-title").textContent = challenge.title;
  document.getElementById("match_items-description").textContent = challenge.description;

  const left = challenge.data.left;
  const right = challenge.data.right;

  const leftX = 90;
  const rightX = 420;
  const rowGap = 64;
  const topY = 40;
  const rowCount = Math.max(left.length, right.length);

  const positions = {};
  left.forEach((item, i) => (positions[item.id] = { x: leftX, y: topY + i * rowGap }));
  right.forEach((item, i) => (positions[item.id] = { x: rightX, y: topY + i * rowGap }));

  const width = 520;
  const height = topY + rowCount * rowGap;

  const matches = []; // [ [leftId, rightId], ... ] - at most one entry per leftId
  const container = document.getElementById("match_items-viz");

  function draw() {
    container.innerHTML = "";
    const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
    addArrowheadMarker(svg, "arrowhead-match");
    const edgeGroup = svg.append("g");
    const nodeGroup = svg.append("g");

    function drawEdges() {
      edgeGroup.selectAll("line").remove();
      matches.forEach(([leftId, rightId], idx) => {
        const end = trimLineEnd(positions[leftId], positions[rightId]);
        edgeGroup
          .append("line")
          .attr("class", "link-line user")
          .attr("x1", positions[leftId].x)
          .attr("y1", positions[leftId].y)
          .attr("x2", end.x)
          .attr("y2", end.y)
          .attr("marker-end", "url(#arrowhead-match)")
          .on("click", () => {
            matches.splice(idx, 1);
            drawEdges();
          });
      });
    }
    drawEdges();

    function drawColumn(items, isLeft) {
      const nodes = nodeGroup
        .selectAll(`g.item-${isLeft ? "left" : "right"}`)
        .data(items, (d) => d.id)
        .join("g")
        .attr("class", `item-${isLeft ? "left" : "right"}`)
        .attr("transform", (d) => `translate(${positions[d.id].x}, ${positions[d.id].y})`);

      nodes
        .append("rect")
        .attr("class", "item-chip node-box correct")
        .attr("x", -BOX_WIDTH / 2)
        .attr("y", -BOX_HEIGHT / 2)
        .attr("width", BOX_WIDTH)
        .attr("height", BOX_HEIGHT)
        .attr("rx", 8);

      nodes.append("text").attr("class", "node-label").text((d) => d.label);

      if (isLeft) {
        nodes
          .append("circle")
          .attr("class", "node-port")
          .attr("cx", BOX_WIDTH / 2 - 8)
          .attr("cy", BOX_HEIGHT / 2 - 8)
          .attr("r", 6)
          .datum((d) => d.id)
          .call(
            d3
              .drag()
              .on("start", function (event, id) {
                this.__sourceId = id;
                this.__temp = svg
                  .append("line")
                  .attr("class", "link-line pending")
                  .attr("marker-end", "url(#arrowhead-match)")
                  .attr("x1", positions[id].x)
                  .attr("y1", positions[id].y)
                  .attr("x2", positions[id].x)
                  .attr("y2", positions[id].y);
              })
              .on("drag", function (event) {
                const [x, y] = d3.pointer(event, svg.node());
                this.__temp.attr("x2", x).attr("y2", y);
              })
              .on("end", function (event) {
                const [x, y] = d3.pointer(event, svg.node());
                this.__temp.remove();

                let targetId = null;
                for (const item of right) {
                  const pos = positions[item.id];
                  if (Math.abs(x - pos.x) < BOX_WIDTH / 2 && Math.abs(y - pos.y) < BOX_HEIGHT / 2) {
                    targetId = item.id;
                    break;
                  }
                }

                if (targetId) {
                  const existingIdx = matches.findIndex(([l]) => l === this.__sourceId);
                  if (existingIdx !== -1) matches.splice(existingIdx, 1);
                  matches.push([this.__sourceId, targetId]);
                  draw();
                }
              })
          );
      }
    }

    drawColumn(left, true);
    drawColumn(right, false);
  }

  draw();

  renderActions("match_items", "match_items-actions", "match_items-result", () => ({
    challenge_id: challenge.challenge_id,
    matches,
  }));
}

// -----------------------------------------------------------------------

setupTabs();
renderArrangeSteps();
renderBuildItYourself();
renderOptionSelect("scenario_based", "scenario");
renderOptionSelect("multiple_choice", "question");
renderMatchItems();
