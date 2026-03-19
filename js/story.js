/**
 * story.js — Guided narrative steps
 */

const Story = (() => {

  const STEPS = [
    {
      title: "Chicago: A City in Motion",
      time: { day: 0, hour: 3 },
      content: `
        <p>It's 3 AM on a Monday. Chicago rests.</p>
        <div class="stat-box">
          <span class="big-num">2.7M</span>
          <span class="small-label">Overnight residential population</span>
        </div>
        <p>The city's <span class="highlight">2.7 million residents</span> are spread
        across 77 community areas — from dense Lincoln Park condos to
        sprawling South Side neighborhoods.</p>
        <p>This is Chicago's baseline. Every bar you see is a census block,
        its height proportional to population. Toggle through the week to
        watch the city come alive.</p>
      `
    },
    {
      title: "The Morning Rush",
      time: { day: 0, hour: 8 },
      content: `
        <p>It's 8 AM Monday. The Loop begins to fill.</p>
        <div class="stat-box">
          <span class="big-num">~800K</span>
          <span class="small-label">Daily commuters entering the Loop</span>
        </div>
        <p>The <span class="highlight">Loop and Streeterville</span> spike dramatically
        as workers pour in from the North Side, South Side, and suburbs via
        the CTA Red, Blue, and Green lines.</p>
        <p>Notice how residential neighborhoods — Rogers Park, Pilsen, Hyde Park —
        quietly deflate as their residents head downtown.</p>
      `
    },
    {
      title: "Peak Daytime — The Loop Dominates",
      time: { day: 2, hour: 12 },
      content: `
        <p>Wednesday noon — the week's busiest moment.</p>
        <div class="stat-box">
          <span class="big-num">3.2M</span>
          <span class="small-label">Estimated daytime peak (LEHD)</span>
        </div>
        <p>The <span class="highlight">Loop towers over the city</span>, housing
        over 500,000 workers at peak. The Magnificent Mile on Michigan Avenue
        adds another wave of retail workers and tourists.</p>
        <p>Wednesday is consistently Chicago's most populated workday —
        Friday sees the earliest departures.</p>
      `
    },
    {
      title: "The Evening Drain",
      time: { day: 0, hour: 17 },
      content: `
        <p>5 PM — the great reversal begins.</p>
        <p>The Loop empties as fast as it filled. Metra platforms, CTA platforms,
        and expressways fill to capacity as workers reverse their morning commute.</p>
        <p>Watch the <span class="highlight">Loop bars collapse</span> while
        residential neighborhoods like Lakeview, Wicker Park, and Bridgeport
        refill with their returning residents.</p>
      `
    },
    {
      title: "Friday Afternoon — The Early Escape",
      time: { day: 4, hour: 14 },
      content: `
        <p>Friday 2 PM — "Summer Friday" effect visible in the data.</p>
        <div class="stat-box">
          <span class="big-num">~15%</span>
          <span class="small-label">Fewer Loop workers vs Wednesday noon</span>
        </div>
        <p>The Loop drains earlier on Fridays. Flexible work schedules,
        remote work on Fridays, and half-day departures make Friday the
        <span class="highlight">least-populated workday</span> in the Loop.</p>
      `
    },
    {
      title: "Weekend — Entertainment Districts Emerge",
      time: { day: 5, hour: 21 },
      content: `
        <p>Saturday 9 PM — the city transforms.</p>
        <p>The Loop nearly empties, but new spikes appear:
        <span class="highlight">Wicker Park, Logan Square, River North,
        and Wrigleyville</span> light up as entertainment destinations.</p>
        <p>Unlike Manhattan's Times Square mega-spike, Chicago's weekend
        activity is more distributed — spread across its vibrant neighborhood
        bar and restaurant culture.</p>
      `
    },
    {
      title: "24/7 Constant Spikes",
      time: { day: 0, hour: 2 },
      content: `
        <p>Some areas never sleep. Look for blocks that stay tall around the clock:</p>
        <ul style="margin:10px 0 10px 16px;color:#8b949e;font-size:13px;line-height:2">
          <li><strong style="color:#e6edf3">Northwestern Memorial Hospital</strong> — Streeterville</li>
          <li><strong style="color:#e6edf3">Rush University Medical Center</strong> — Near West Side</li>
          <li><strong style="color:#e6edf3">University of Chicago</strong> — Hyde Park</li>
          <li><strong style="color:#e6edf3">Cabrini-Green / public housing</strong> — Near North</li>
        </ul>
        <p>Hospitals operate 24/7. Dense residential towers never fully empty.
        Universities maintain constant populations of residents and staff.</p>
      `
    },
    {
      title: "Explore Yourself",
      time: { day: 0, hour: 9 },
      content: `
        <p>You've seen Chicago breathe through a full week.</p>
        <p>Now use the <span class="highlight">Visualization tab</span> to explore
        freely — scrub through any hour, toggle between population and change modes,
        or hover over any block for exact figures.</p>
        <div class="stat-box">
          <span class="big-num">+500K</span>
          <span class="small-label">Peak net inflow to the Loop on a workday</span>
        </div>
        <p>Chicago adds and subtracts nearly <span class="highlight">the population
        of Atlanta</span> from its core every single workday.</p>
      `
    }
  ];

  let _currentStep = 0;
  let _onStepChange = null;

  function init(onStepChange) {
    _onStepChange = onStepChange;
    _render();
    _bindNav();
  }

  function _render() {
    const container = document.getElementById("story-content");
    container.innerHTML = STEPS.map((step, i) => `
      <div class="story-step ${i === 0 ? "active" : ""}" data-step="${i}">
        <h3>${step.title}</h3>
        ${step.content}
      </div>
    `).join("");
  }

  function _bindNav() {
    document.getElementById("btn-prev").addEventListener("click", () => {
      if (_currentStep > 0) _goTo(_currentStep - 1);
    });
    document.getElementById("btn-next").addEventListener("click", () => {
      if (_currentStep < STEPS.length - 1) _goTo(_currentStep + 1);
    });
  }

  function _goTo(step) {
    document.querySelectorAll(".story-step").forEach(el => el.classList.remove("active"));
    document.querySelector(`.story-step[data-step="${step}"]`).classList.add("active");

    document.getElementById("story-progress").textContent =
      `${step + 1} / ${STEPS.length}`;

    document.getElementById("btn-prev").disabled = step === 0;
    document.getElementById("btn-next").disabled = step === STEPS.length - 1;

    _currentStep = step;

    if (_onStepChange) {
      _onStepChange(STEPS[step].time);
    }
  }

  return { init };
})();
