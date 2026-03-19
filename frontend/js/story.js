/**
 * story.js — Guided narrative steps
 */

const Story = (() => {

  const STEPS = [
    // ── 1 ──────────────────────────────────────────────────────────────────
    {
      title: "Chicago: A City in Motion",
      time: { day: 0, hour: 3 },
      content: `
        <p>It's 3 AM Monday. Chicago is as quiet as it ever gets.</p>
        <div class="stat-box">
          <span class="big-num">2.7M</span>
          <span class="small-label">Overnight residential population (Census 2020)</span>
        </div>
        <p>Every bar is a census block — height = people. Right now you're looking
        at Chicago's true residential skeleton: densely packed along the North Side
        lakefront, thinning toward the South and West Sides.</p>
        <p>This baseline will <span class="highlight">nearly double</span> by
        Wednesday noon. Watch what happens.</p>
      `
    },

    // ── 2 ──────────────────────────────────────────────────────────────────
    {
      title: "The North–South Divide at Rest",
      time: { day: 0, hour: 4 },
      content: `
        <p>Before the commute begins, the residential inequality of Chicago is
        starkly visible in the bar heights themselves.</p>
        <div class="contrast-box">
          <div class="contrast-item">
            <span class="contrast-label">Lincoln Park / Lakeview</span>
            <span class="contrast-value high">Dense</span>
          </div>
          <div class="contrast-item">
            <span class="contrast-label">Englewood / Auburn Gresham</span>
            <span class="contrast-value low">Sparse</span>
          </div>
        </div>
        <p>The North Side lakefront neighborhoods house 3–4x more people per
        block than many South Side neighborhoods — a pattern rooted in decades
        of disinvestment, white flight, and redlining whose effects are still
        embedded in the 2020 Census data powering this map.</p>
      `
    },

    // ── 3 ──────────────────────────────────────────────────────────────────
    {
      title: "Morning Rush — The Loop Ignites",
      time: { day: 0, hour: 8 },
      content: `
        <p>8 AM Monday. The Red, Blue, Brown, and Green lines flood the Loop
        with commuters from every corner of the city.</p>
        <div class="stat-box">
          <span class="big-num">~500K</span>
          <span class="small-label">Net inflow to the Loop by 9 AM</span>
        </div>
        <p>The <span class="highlight">Clark/Lake and Washington/Wells
        interchange</span> blocks explode — this is where the L lines converge,
        depositing thousands of workers per hour into the financial and
        government district.</p>
        <p>Meanwhile Lakeview, Logan Square, and Pilsen visibly deflate —
        their residents are on those trains.</p>
      `
    },

    // ── 4 ──────────────────────────────────────────────────────────────────
    {
      title: "The Medical Corridor — A Different Kind of Spike",
      time: { day: 0, hour: 10 },
      content: `
        <p>Look at the Near West Side, just west of the Loop. A cluster of
        blocks that barely moved during the commute suddenly shows sustained
        high population all day.</p>
        <div class="event-tag">Illinois Medical District</div>
        <p>The <span class="highlight">Illinois Medical District</span> — home to
        Rush University Medical Center, UI Health, and Jesse Brown VA Medical
        Center — is one of the largest medical districts in the world.
        Nearly <strong style="color:#e6edf3">40,000 employees and patients</strong>
        occupy this zone daily, independent of the typical 9-to-5 cycle.</p>
        <p>Similarly, <strong style="color:#e6edf3">Northwestern Memorial</strong>
        in Streeterville adds another 16,000+ — watch that block stay red
        even at 2 AM.</p>
      `
    },

    // ── 5 ──────────────────────────────────────────────────────────────────
    {
      title: "Wednesday Noon — Peak Chicago",
      time: { day: 2, hour: 12 },
      content: `
        <p>Wednesday noon is the statistical peak of Chicago's week — the moment
        when the most people occupy the city simultaneously.</p>
        <div class="stat-box">
          <span class="big-num">3.2M</span>
          <span class="small-label">Estimated total city population at peak</span>
        </div>
        <p><span class="highlight">Wednesday, not Monday</span>, is peak day.
        Monday sees slower ramp-ups — remote workers, late starters, travel
        returning from weekends. By Wednesday everyone is in.</p>
        <div class="contrast-box">
          <div class="contrast-item">
            <span class="contrast-label">Loop (daytime)</span>
            <span class="contrast-value high">+500K vs overnight</span>
          </div>
          <div class="contrast-item">
            <span class="contrast-label">Loop (3 AM)</span>
            <span class="contrast-value low">~8K residents</span>
          </div>
        </div>
        <p>The Loop has almost <span class="highlight">no one living in it</span>.
        Every bar you see at noon is a worker or visitor — not a resident.</p>
      `
    },

    // ── 6 ──────────────────────────────────────────────────────────────────
    {
      title: "Wrigleyville — The Cubs Anomaly",
      time: { day: 2, hour: 14 },
      content: `
        <p>In our averaged annual model, Wrigleyville (Lakeview) shows a
        modest Wednesday afternoon bump. But in reality, this neighborhood
        hides one of Chicago's biggest recurring anomalies.</p>
        <div class="event-tag anomaly">Filtered from model: Game Day</div>
        <p>On <span class="highlight">Cubs home game days</span>, the blocks
        around Wrigley Field (Addison Red Line) spike by
        <strong style="color:#e6edf3">~40,000 people</strong> within a
        2-hour window. The 2023 Cubs played 81 home games — nearly half
        the season — making this one of Chicago's most frequent
        population anomalies.</p>
        <p>Our outlier removal (3σ filter) partially smooths these spikes,
        but game days are visible as elevated Wrigleyville ridership even
        in the averaged data.</p>
      `
    },

    // ── 7 ──────────────────────────────────────────────────────────────────
    {
      title: "The Evening Reversal",
      time: { day: 0, hour: 17 },
      content: `
        <p>5 PM — the city's daily heartbeat reverses direction.</p>
        <p>The same trains that emptied the neighborhoods this morning now
        carry those workers home. The Loop's bars collapse in real time
        while residential corridors refill.</p>
        <div class="contrast-box">
          <div class="contrast-item">
            <span class="contrast-label">Loop at 5 PM</span>
            <span class="contrast-value low">Draining fast</span>
          </div>
          <div class="contrast-item">
            <span class="contrast-label">Lakeview at 6 PM</span>
            <span class="contrast-value high">Refilling</span>
          </div>
        </div>
        <p>One anomaly stands out: <span class="highlight">River North and
        the Streeterville restaurant corridor</span> barely dip at 5 PM —
        the dinner shift replaces the office crowd almost seamlessly,
        keeping those blocks elevated through 9 PM.</p>
      `
    },

    // ── 8 ──────────────────────────────────────────────────────────────────
    {
      title: "Friday — The Early Escape",
      time: { day: 4, hour: 13 },
      content: `
        <p>Friday 1 PM. Something subtle but consistent appears in the data.</p>
        <div class="stat-box">
          <span class="big-num">~12%</span>
          <span class="small-label">Fewer Loop workers vs Wednesday noon</span>
        </div>
        <p>The Loop starts draining <span class="highlight">2–3 hours earlier
        on Fridays</span> than any other weekday. This is the aggregate
        fingerprint of flex time, remote Fridays, and early weekend
        departures — visible at the city scale in CTA exit data.</p>
        <p>By 3 PM Friday the Loop looks more like a Saturday than a Wednesday.
        By 6 PM it's nearly silent.</p>
      `
    },

    // ── 9 ──────────────────────────────────────────────────────────────────
    {
      title: "Lollapalooza — Grant Park Transformed",
      time: { day: 5, hour: 15 },
      content: `
        <p>Saturday afternoon. Grant Park on a normal weekend is calm.
        But every August, something extraordinary overwrites this pattern.</p>
        <div class="event-tag anomaly">Annual anomaly: Lollapalooza (August)</div>
        <p>Lollapalooza draws <span class="highlight">~100,000 people per day
        to Grant Park</span> — directly on top of the blocks just east of
        the Loop. For 4 days straight, those blocks show population densities
        that rival the Loop at peak commute hour, but on a weekend.</p>
        <p>Our model averages this away — but in the raw 2023 data, those
        4 August days were flagged as outliers and removed before averaging,
        which is exactly correct: they are exceptional, not typical.</p>
      `
    },

    // ── 10 ─────────────────────────────────────────────────────────────────
    {
      title: "Saturday Night — Chicago's Real Nightlife Geography",
      time: { day: 5, hour: 22 },
      content: `
        <p>10 PM Saturday. The Loop is nearly empty. But look where
        the city's energy has migrated.</p>
        <div class="contrast-box">
          <div class="contrast-item">
            <span class="contrast-label">Wicker Park / Bucktown</span>
            <span class="contrast-value high">Elevated</span>
          </div>
          <div class="contrast-item">
            <span class="contrast-label">River North</span>
            <span class="contrast-value high">Elevated</span>
          </div>
          <div class="contrast-item">
            <span class="contrast-label">Hyde Park</span>
            <span class="contrast-value low">Quiet</span>
          </div>
        </div>
        <p>Unlike Manhattan where nightlife concentrates in one mega-zone,
        Chicago's Saturday night population is <span class="highlight">
        distributed across 6–8 neighborhood entertainment districts</span> —
        a reflection of its neighborhood-first urban identity.</p>
        <p>The South Side stays quiet at night — a persistent contrast
        that reflects both demographic patterns and the geography of
        Chicago's entertainment investment.</p>
      `
    },

    // ── 11 ─────────────────────────────────────────────────────────────────
    {
      title: "Sunday — The Slowest Day",
      time: { day: 6, hour: 14 },
      content: `
        <p>Sunday afternoon is Chicago's lowest-population moment of the week —
        lower even than Saturday, lower than any weeknight.</p>
        <div class="stat-box">
          <span class="big-num">Sunday</span>
          <span class="small-label">Lowest CTA ridership day of the week</span>
        </div>
        <p>One exception: <span class="highlight">the lakefront trail corridor</span>
        on nice-weather Sundays sees elevated foot traffic from Edgewater down
        to Hyde Park — but this isn't captured by the CTA rail model since
        most of those trips are by foot or bike.</p>
        <p>The Chicago Marathon (October Sunday) is the most dramatic single-day
        exception — <strong style="color:#e6edf3">~45,000 runners plus 1M+ spectators</strong>
        reshape the entire South Side population for one day each year.
        Correctly removed as an outlier in our model.</p>
      `
    },

    // ── 12 ─────────────────────────────────────────────────────────────────
    {
      title: "The Blocks That Never Sleep",
      time: { day: 0, hour: 2 },
      content: `
        <p>2 AM Monday. Most of Chicago is at its quietest. But some blocks
        barely changed since noon yesterday.</p>
        <ul style="margin:10px 0 10px 16px;color:#8b949e;font-size:13px;line-height:2.2">
          <li><strong style="color:#e6edf3">Northwestern Memorial Hospital</strong>
              — Streeterville — 16,000 staff + patients</li>
          <li><strong style="color:#e6edf3">Rush / UI Health / Jesse Brown VA</strong>
              — Illinois Medical District</li>
          <li><strong style="color:#e6edf3">University of Chicago</strong>
              — Hyde Park — residential campus, always occupied</li>
          <li><strong style="color:#e6edf3">O'Hare Blue Line terminus</strong>
              — 24-hour airport creates constant late-night flow</li>
          <li><strong style="color:#e6edf3">Cabrini-Green area towers</strong>
              — High-density residential, stable population</li>
        </ul>
        <p>These are Chicago's <span class="highlight">structural constants</span> —
        immune to the daily commute rhythm that governs the rest of the city.</p>
      `
    },

    // ── 13 ─────────────────────────────────────────────────────────────────
    {
      title: "What the Model Misses",
      time: { day: 0, hour: 9 },
      content: `
        <p>Every model has limits. Here's what this one doesn't capture:</p>
        <ul style="margin:10px 0 10px 16px;color:#8b949e;font-size:13px;line-height:2.2">
          <li><strong style="color:#e6edf3">Bus riders</strong> — ~30% of CTA trips
              are by bus, not rail. South and West Side neighborhoods
              are undercounted as a result.</li>
          <li><strong style="color:#e6edf3">Drivers</strong> — ~40% of Chicago
              commuters drive. The expressway corridors (I-90, I-94, I-290)
              are invisible to this model.</li>
          <li><strong style="color:#e6edf3">Seasonal variation</strong> — Summer
              Lakeshore crowds, winter weather drops, and tourist peaks
              are averaged away.</li>
          <li><strong style="color:#e6edf3">Special events</strong> — Removed
              as outliers: correct for a typical-week model, but those
              events tell their own story.</li>
        </ul>
        <p>The <span class="highlight">South and West Sides are likely
        underrepresented</span> in the daytime model — their residents
        commute heavily by bus and car, not CTA rail.</p>
      `
    },

    // ── 14 ─────────────────────────────────────────────────────────────────
    {
      title: "Explore Chicago Yourself",
      time: { day: 0, hour: 8 },
      content: `
        <p>You've seen Chicago's population breathe — its rhythms, contrasts,
        anomalies, and constants.</p>
        <div class="stat-box">
          <span class="big-num">+500K</span>
          <span class="small-label">People the Loop gains every workday morning</span>
        </div>
        <p>Use the <span class="highlight">Visualization tab</span> to explore
        freely. Toggle <strong>Change mode</strong> to see which blocks gain
        and lose population hour by hour. Hover any block for exact numbers.</p>
        <p>Some questions worth exploring:</p>
        <ul style="margin:8px 0 0 16px;color:#8b949e;font-size:13px;line-height:2">
          <li>Which South Side neighborhood exports the most workers?</li>
          <li>Which block stays highest at 3 AM?</li>
          <li>How does Saturday noon compare to Wednesday noon in Hyde Park?</li>
        </ul>
      `
    }
  ];

  let _currentStep  = 0;
  let _onStepChange = null;

  function init(onStepChange) {
    _onStepChange = onStepChange;
    _render();
    _bindNav();
    _goTo(0);
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
    document.querySelectorAll(".story-step")
      .forEach(el => el.classList.remove("active"));
    document.querySelector(`.story-step[data-step="${step}"]`)
      .classList.add("active");

    document.getElementById("story-progress").textContent =
      `${step + 1} / ${STEPS.length}`;
    document.getElementById("btn-prev").disabled = step === 0;
    document.getElementById("btn-next").disabled = step === STEPS.length - 1;

    _currentStep = step;
    if (_onStepChange) _onStepChange(STEPS[step].time);
  }

  return { init };
})();
