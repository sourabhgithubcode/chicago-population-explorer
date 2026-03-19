/**
 * data.js — Loads and manages population data
 */

const AppData = (() => {
  let _data = null;
  let _meta = null;
  const BASE_URL = "./data/";

  async function load() {
    const [popResp, metaResp] = await Promise.all([
      fetch(BASE_URL + "chicago_population.json"),
      fetch(BASE_URL + "metadata.json")
    ]);

    if (!popResp.ok) throw new Error("Population data not found. Run the pipeline first.");
    _data = await popResp.json();
    _meta = metaResp.ok ? await metaResp.json() : {};

    console.log(
      `Loaded: ${_data.blocks.length.toLocaleString()} blocks | ` +
      `${Object.keys(_data.hourly).length} days`
    );
    return { data: _data, meta: _meta };
  }

  function getBlocks() { return _data?.blocks ?? []; }
  function getMeta()   { return _meta ?? {}; }

  /**
   * Get population array for a given day (0=Mon) and hour (0-23)
   * Returns array of integers, same order as blocks
   */
  function getHourlyPop(day, hour) {
    if (!_data) return [];
    return _data.hourly[day]?.[hour] ?? [];
  }

  /**
   * Get overnight (3am Monday) baseline population per block
   */
  function getBaseline() {
    return getHourlyPop(0, 3);
  }

  /**
   * Get change vs baseline for a given day/hour
   * Returns array of deltas
   */
  function getChange(day, hour) {
    const current  = getHourlyPop(day, hour);
    const baseline = getBaseline();
    return current.map((v, i) => v - (baseline[i] ?? 0));
  }

  /**
   * Get total population for a given day/hour
   */
  function getTotalPop(day, hour) {
    const pops = getHourlyPop(day, hour);
    return pops.reduce((a, b) => a + b, 0);
  }

  /**
   * Convert flat time index (0-167) to {day, hour}
   */
  function timeIndexToDayHour(index) {
    return {
      day:  Math.floor(index / 24),
      hour: index % 24
    };
  }

  const DAY_NAMES  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const DAY_SHORT  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  function formatHour(hour) {
    if (hour === 0)  return "12:00 AM";
    if (hour === 12) return "12:00 PM";
    return hour < 12
      ? `${hour}:00 AM`
      : `${hour - 12}:00 PM`;
  }

  return {
    load,
    getBlocks,
    getMeta,
    getHourlyPop,
    getBaseline,
    getChange,
    getTotalPop,
    timeIndexToDayHour,
    DAY_NAMES,
    DAY_SHORT,
    formatHour
  };
})();
