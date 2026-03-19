/**
 * story.js — Guided narrative steps
 */

const Story = (() => {

  const STEPS = [

    // ── 1 ──────────────────────────────────────────────────────────────────
    {
      title: "3 AM. Chicago Exhales.",
      time: { day: 0, hour: 3 },
      content: `
        <p>It's Monday, 3 AM. Chicago is as still as it ever gets —
        and what you're looking at right now is history.</p>
        <div class="stat-box">
          <span class="big-num">2.7M</span>
          <span class="small-label">Residents — US Census 2020</span>
        </div>
        <p>Every bar is a census block. Height is people. The pattern you
        see — dense along the North Side lakefront, thin across the South
        and West Sides — wasn't shaped by housing prices or personal choice.
        It was <span class="highlight">drawn by government policy</span>.</p>
        <p>In 1940, federal mortgage officials literally colored Chicago's
        neighborhoods red, yellow, and green on maps. Red meant "hazardous"
        — meaning Black. Those redlined neighborhoods were denied loans,
        starved of investment, and left to decline. Eighty years later,
        the bar heights still echo those maps.</p>
        <p>This is where Chicago's story begins. Press Next — and watch
        what happens when the sun comes up.</p>
      `
    },

    // ── 2 ──────────────────────────────────────────────────────────────────
    {
      title: "The Great Migration — Still Visible at 4 AM",
      time: { day: 0, hour: 4 },
      content: `
        <p>Before dawn, the city's demographic history is most readable.
        Look south of the Loop — that dense corridor running down State
        Street and King Drive through Bronzeville.</p>
        <div class="event-tag">Bronzeville — The Black Metropolis</div>
        <p>Between 1910 and 1970, <span class="highlight">over 500,000
        Black Americans</span> fled Jim Crow's violence and poverty in
        the South and arrived in Chicago, most settling on the South Side.
        They built what Langston Hughes called "the greatest Negro city
        in the world" — theaters, newspapers, blues clubs, churches,
        businesses — in a 30-block stretch they couldn't legally leave
        due to racially restrictive covenants.</p>
        <p>The census blocks in Bronzeville still show that residential
        concentration. What they can't show is that this neighborhood was
        once twice as dense — urban renewal and expressway construction
        in the 1950s demolished much of it.</p>
        <p>The <strong style="color:#e6edf3">Dan Ryan Expressway (I-94)</strong>
        was deliberately routed to create a physical wall between the
        Black South Side and white neighborhoods to the west. You can
        trace that wall in the bar heights even now.</p>
      `
    },

    // ── 3 ──────────────────────────────────────────────────────────────────
    {
      title: "6 AM — The L Wakes Up",
      time: { day: 0, hour: 6 },
      content: `
        <p>The first Red Line trains leave Howard and 95th Street.
        Something no other American city does begins to happen.</p>
        <div class="contrast-box">
          <div class="contrast-item">
            <span class="contrast-label">Howard Station (Rogers Park)</span>
            <span class="contrast-value low">Losing people</span>
          </div>
          <div class="contrast-item">
            <span class="contrast-label">The Loop</span>
            <span class="contrast-value high">Gaining fast</span>
          </div>
        </div>
        <p>Chicago's <span class="highlight">elevated train — "the L" —
        has run continuously since 1892</span>. It built the city outward
        along its spokes: the Red Line created Rogers Park, the Blue Line
        created Wicker Park and Pilsen's edge, the Green Line connected
        Bronzeville. Every neighborhood with an L stop is a neighborhood
        that grew around it.</p>
        <p>The Loop's elevated square — where five lines share the same
        tracks — made Chicago's downtown the most transit-accessible
        workplace district in America outside Manhattan. Employers built
        there. Workers flooded in every morning. The daily commute became
        the city's defining rhythm, and it still is.</p>
      `
    },

    // ── 4 ──────────────────────────────────────────────────────────────────
    {
      title: "8 AM — The Most Extreme Commute in America",
      time: { day: 0, hour: 8 },
      content: `
        <p>By 8 AM, the Loop is doing something no other American downtown
        does at this scale.</p>
        <div class="stat-box">
          <span class="big-num">~8,000</span>
          <span class="small-label">People who actually <em>live</em> in the Loop</span>
        </div>
        <p>Eight thousand residents. Yet by 9 AM on a weekday, the Loop
        holds over <span class="highlight">500,000 workers and visitors</span> —
        a <strong style="color:#e6edf3">60x population surge</strong> in
        three hours. No other neighborhood in Chicago, or in America,
        flips this completely.</p>
        <p>What you're watching is the Red, Blue, Brown, Green, Orange,
        and Pink lines all converging on a single square mile. The
        <strong style="color:#e6edf3">Clark/Lake interchange</strong>
        alone — where five lines share one platform — funnels tens of
        thousands per hour through one block.</p>
        <p>Residential neighborhoods visibly deflate as you watch.
        Lakeview, Logan Square, Pilsen, Bridgeport — the trains are
        taking their residents downtown. The bars shrink in real time.</p>
      `
    },

    // ── 5 ──────────────────────────────────────────────────────────────────
    {
      title: "The Invisible Commuters — Pilsen, Chinatown, Bridgeport",
      time: { day: 0, hour: 9 },
      content: `
        <p>Notice anything strange? Some neighborhoods barely change at all
        between 3 AM and 9 AM, even though their residents clearly go to work.</p>
        <div class="event-tag anomaly">Model blind spot: Car & bus commuters</div>
        <p><span class="highlight">Pilsen, Chinatown, and Bridgeport</span>
        are Chicago's most car-dependent working-class neighborhoods.
        Their residents commute by car on the I-55 and I-90/94 expressways,
        or by bus — not by L train. This model is built on CTA rail data,
        so it literally cannot see their daily departure.</p>
        <p>This matters: <strong style="color:#e6edf3">Pilsen is one of
        Chicago's densest neighborhoods</strong>, home to 80,000 mostly
        Mexican-American residents. When the map shows it barely changing,
        that's not reality — that's a data gap. The South Side's daily
        population export is <em>larger</em> than the model shows, just
        invisible to rail turnstiles.</p>
        <p>The CTA bus data we added helps, but 40% of Chicago commuters
        drive. Their story doesn't appear here.</p>
      `
    },

    // ── 6 ──────────────────────────────────────────────────────────────────
    {
      title: "Wednesday Noon — Peak Chicago",
      time: { day: 2, hour: 12 },
      content: `
        <p>This is it. Wednesday at noon is the statistical maximum —
        the single hour when more people occupy Chicago simultaneously
        than any other moment in the typical week.</p>
        <div class="stat-box">
          <span class="big-num">3.2M</span>
          <span class="small-label">Total city population — LEHD daytime estimate</span>
        </div>
        <p><span class="highlight">Why Wednesday, not Monday?</span>
        Remote work changed the calculus. Monday is the most common
        work-from-home day. Friday afternoon starts early. Tuesday
        through Thursday are now Chicago's "real" workweek —
        Wednesday noon is when the most people have actually
        made it into the office.</p>
        <p>That extra 500,000 people above overnight baseline are almost
        entirely concentrated within 2 miles of the Loop. The lakefront
        and the expressway corridors funnel the region's 9.5 million
        suburban commuters into this same dense core.</p>
        <div class="contrast-box">
          <div class="contrast-item">
            <span class="contrast-label">Loop: 3 AM residents</span>
            <span class="contrast-value low">~8,000</span>
          </div>
          <div class="contrast-item">
            <span class="contrast-label">Loop: Wed noon population</span>
            <span class="contrast-value high">~500,000+</span>
          </div>
        </div>
      `
    },

    // ── 7 ──────────────────────────────────────────────────────────────────
    {
      title: "The Medical City — 40,000 Who Don't Follow the Rules",
      time: { day: 2, hour: 14 },
      content: `
        <p>Find the Near West Side, just west of the Loop. See those blocks
        that stayed elevated all morning, through lunch, and will stay
        elevated at 2 AM? That's not a commuter pattern. That's
        something different.</p>
        <div class="event-tag">Illinois Medical District — World's Largest</div>
        <p>The <span class="highlight">Illinois Medical District</span> is
        the largest urban medical district on earth: Rush University Medical
        Center, University of Illinois Health, Jesse Brown VA, and two dozen
        smaller facilities — <strong style="color:#e6edf3">40,000 employees
        and patients</strong> on any given day, operating on 8-hour rotating
        shifts around the clock.</p>
        <p>The same pattern appears at <strong style="color:#e6edf3">Northwestern
        Memorial in Streeterville</strong> (16,000+) and
        <strong style="color:#e6edf3">University of Chicago Medicine
        in Hyde Park</strong>. These are population anchors that ignore
        the commuter tide — they pulse on their own 24-hour rhythm,
        not the city's 9-to-5.</p>
        <p>Chicago's hospital complex is also an economic equalizer:
        it's one of the largest employers of South and West Side residents,
        connecting neighborhoods that are otherwise cut off from the
        Loop job market.</p>
      `
    },

    // ── 8 ──────────────────────────────────────────────────────────────────
    {
      title: "McCormick Place — The Convention Earthquake",
      time: { day: 1, hour: 10 },
      content: `
        <p>Look at the lakefront just south of the Museum Campus —
        a cluster of blocks near Cermak and Lake Shore Drive.
        On a normal Tuesday morning, quiet. But on certain weeks,
        it becomes the most densely occupied non-Loop location in the city.</p>
        <div class="event-tag anomaly">Filtered: Major conventions (avg 10–15 per month)</div>
        <p><span class="highlight">McCormick Place is the largest
        convention center in North America</span> — 2.6 million square feet
        on the lakefront. When it's running a major show, it generates
        a private population spike that rivals a Cubs game: 50,000–80,000
        attendees for events like the Chicago Auto Show, the restaurant
        industry's NRA Show, or ASCO (the world's largest oncology conference).</p>
        <p>Our model averages this away — conventions appear as modest
        elevated ridership in the average. But in the raw data, McCormick
        weeks create some of the strongest anomalies in the entire dataset,
        filling hotels from River North to Hyde Park and turning the
        Green Line into a professional conference shuttle.</p>
        <p>The convention economy brings <strong style="color:#e6edf3">
        ~13 million visitors and $7.5B annually</strong> to Chicago —
        nearly invisible in population models, enormous in reality.</p>
      `
    },

    // ── 9 ──────────────────────────────────────────────────────────────────
    {
      title: "Friday Afternoon — The Work-From-Home Fingerprint",
      time: { day: 4, hour: 14 },
      content: `
        <p>It's Friday 2 PM. The Loop is already draining — 2 to 3 hours
        earlier than any other weekday.</p>
        <div class="stat-box">
          <span class="big-num">~15%</span>
          <span class="small-label">Fewer Loop workers vs. Wednesday noon</span>
        </div>
        <p>This is the aggregate fingerprint of the post-pandemic work
        arrangement. Friday is now Chicago's <span class="highlight">
        lowest downtown-occupancy weekday</span>, driven by three
        overlapping patterns visible in the CTA data:</p>
        <ul style="margin:10px 0 10px 16px;color:#8b949e;font-size:13px;line-height:2">
          <li><strong style="color:#e6edf3">Remote Fridays</strong> — most hybrid workers skip the office</li>
          <li><strong style="color:#e6edf3">Early weekend departures</strong> — Metra and O'Hare surge by 3 PM</li>
          <li><strong style="color:#e6edf3">Flex time</strong> — professionals leaving at 1 PM to beat traffic</li>
        </ul>
        <p>By 4 PM Friday, the Loop looks more like a Saturday than a Wednesday.
        It's a structural change — pre-2020 CTA data showed a much more
        symmetric week. The dip is permanent now.</p>
      `
    },

    // ── 10 ─────────────────────────────────────────────────────────────────
    {
      title: "Saturday Night — Six Downtowns",
      time: { day: 5, hour: 22 },
      content: `
        <p>10 PM Saturday. The Loop is nearly empty. The office buildings
        are dark. But Chicago's population hasn't gone home — it's
        redistributed.</p>
        <div class="contrast-box">
          <div class="contrast-item">
            <span class="contrast-label">Wicker Park / Bucktown</span>
            <span class="contrast-value high">Surging</span>
          </div>
          <div class="contrast-item">
            <span class="contrast-label">River North / Gold Coast</span>
            <span class="contrast-value high">Surging</span>
          </div>
          <div class="contrast-item">
            <span class="contrast-label">Andersonville / Boystown</span>
            <span class="contrast-value high">Elevated</span>
          </div>
          <div class="contrast-item">
            <span class="contrast-label">Englewood / Auburn Gresham</span>
            <span class="contrast-value low">Quiet</span>
          </div>
        </div>
        <p>Unlike Manhattan — where nightlife concentration creates a
        single mega-zone in Midtown and downtown — Chicago's Saturday
        night energy <span class="highlight">distributes across six to
        eight neighborhood districts simultaneously</span>. This is
        what "city of neighborhoods" actually means in population terms.</p>
        <p>The South Side's quiet isn't just about nightlife investment —
        it reflects transportation geography. The Green and Red Lines
        don't run as frequently after midnight, making South Side
        neighborhoods harder to reach for nightlife crowds that
        originated further north.</p>
      `
    },

    // ── 11 ─────────────────────────────────────────────────────────────────
    {
      title: "The Year's Biggest Moments (Filtered Out)",
      time: { day: 5, hour: 15 },
      content: `
        <p>This model shows a <em>typical</em> week. To build it, we
        removed hundreds of days where Chicago wasn't being typical at all.</p>
        <div class="event-tag anomaly">2023 Events removed as outliers</div>
        <ul style="margin:10px 0 10px 16px;color:#8b949e;font-size:13px;line-height:2">
          <li><strong style="color:#e6edf3">Lollapalooza</strong> (Aug 3–6)
              — ~100,000/day, Grant Park. Four straight days of non-typical L ridership.</li>
          <li><strong style="color:#e6edf3">Chicago Marathon</strong> (Oct 8)
              — 45,000 runners + 1.7M spectators lining 26.2 miles of South Side streets</li>
          <li><strong style="color:#e6edf3">Cubs home games</strong> (81 dates)
              — ~40,000 per game at Wrigley, Addison Red Line becomes a crush</li>
          <li><strong style="color:#e6edf3">White Sox games</strong>
              — Guaranteed Rate Field, 35th-Sox-Dan Ryan stop, South Side spike</li>
          <li><strong style="color:#e6edf3">Pride Parade</strong> (June)
              — 1M+ along Broadway and Halsted in Boystown</li>
          <li><strong style="color:#e6edf3">Air and Water Show</strong> (Aug)
              — 2M over 2 days along the lakefront from Fullerton to Oak Street</li>
        </ul>
        <p>Each of these events creates population spikes that would
        <span class="highlight">completely distort the "typical week"</span> signal
        if included. They were correctly removed — but they're also the weeks
        that make Chicago feel like Chicago.</p>
      `
    },

    // ── 12 ─────────────────────────────────────────────────────────────────
    {
      title: "O'Hare — A City at the Edge of the City",
      time: { day: 0, hour: 7 },
      content: `
        <p>Look at the far northwest corner — where the Blue Line ends at
        O'Hare. That's not just a transit terminus. It's a population
        engine that runs 24 hours a day, 365 days a year.</p>
        <div class="stat-box">
          <span class="big-num">68M</span>
          <span class="small-label">Passengers through O'Hare in 2023 — 3rd busiest globally</span>
        </div>
        <p><span class="highlight">O'Hare is the only major American
        airport directly connected to its city's downtown rail network</span> —
        a 45-minute Blue Line ride from terminal to Loop, running
        all night. Every other global hub airport requires a cab, Uber,
        or commuter rail transfer.</p>
        <p>The population dynamics are unique: O'Hare generates constant
        inflow at all hours, not just peak travel times. Business travelers
        arriving at 6 AM, connecting passengers in transit, 50,000 airport
        employees on rotating shifts — the blocks around O'Hare never
        fully quiet down, even at 3 AM. It's the closest thing Chicago
        has to a truly 24-hour population anchor outside the hospitals.</p>
      `
    },

    // ── 13 ─────────────────────────────────────────────────────────────────
    {
      title: "What This Map Cannot Tell You",
      time: { day: 0, hour: 9 },
      content: `
        <p>Every visualization is a perspective, not truth. Here's what
        this one misses — and why those gaps matter for Chicago specifically.</p>
        <ul style="margin:10px 0 10px 16px;color:#8b949e;font-size:13px;line-height:2.2">
          <li><strong style="color:#e6edf3">The car commuter majority</strong>
              — 40%+ of Chicagoans drive to work. The I-90, I-94, I-290
              corridors carry hundreds of thousands invisibly. The West Side
              is especially undercounted.</li>
          <li><strong style="color:#e6edf3">Undocumented residents</strong>
              — Chicago's large undocumented community (~150,000 estimated)
              is underrepresented in the 2020 Census base population,
              particularly in Pilsen, Little Village, and Humboldt Park.</li>
          <li><strong style="color:#e6edf3">The lakefront in summer</strong>
              — On a July Saturday, 2M+ people line the 26-mile lakefront.
              Almost none arrive by L. This model shows a quiet weekend.</li>
          <li><strong style="color:#e6edf3">Gentrification in motion</strong>
              — Pilsen, Logan Square, and Woodlawn are changing fast.
              The 2020 Census is already outdated for these neighborhoods.</li>
        </ul>
        <p>The South and West Sides commute by bus, car, and on foot —
        <span class="highlight">their daily population export is real but
        partially invisible here</span>. This model is most accurate for
        the transit-rich North Side and Loop. Treat South and West Side
        data as lower bounds, not true pictures.</p>
      `
    },

    // ── 14 ─────────────────────────────────────────────────────────────────
    {
      title: "Explore Chicago Yourself",
      time: { day: 0, hour: 8 },
      content: `
        <p>You've seen Chicago's population breathe — its history written
        in overnight bars, its commuter tide flooding and reversing, its
        invisible populations and spectacular anomalies.</p>
        <div class="stat-box">
          <span class="big-num">77</span>
          <span class="small-label">Official community areas — each with its own story</span>
        </div>
        <p>Switch to the <span class="highlight">Visualization tab</span>
        to explore freely. Try these:</p>
        <ul style="margin:8px 0 0 16px;color:#8b949e;font-size:13px;line-height:2.2">
          <li>Toggle <strong style="color:#e6edf3">Change mode</strong>
              — which blocks gain the most daytime population? Which lose the most?</li>
          <li>Compare <strong style="color:#e6edf3">Hyde Park at noon vs. 3 AM</strong>
              — University of Chicago makes it one of the city's most stable blocks</li>
          <li>Watch <strong style="color:#e6edf3">Friday vs. Wednesday at 2 PM</strong>
              in the Loop — the remote-work effect is visible</li>
          <li>Find the block that stays tallest at <strong style="color:#e6edf3">4 AM</strong>
              — it's almost certainly a hospital</li>
          <li>Compare <strong style="color:#e6edf3">Saturday vs. Sunday midday</strong>
              — Saturday is when Chicago actually goes out</li>
        </ul>
        <p style="margin-top:12px;font-size:12px;color:#8b949e">
          Data: US Census 2020 · CTA Rail + Bus 2023 · LEHD Daytime Estimates · CTA GTFS
        </p>
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
