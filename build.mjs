import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const stats = JSON.parse(readFileSync(new URL('./src/question-rates.json', import.meta.url), 'utf8'));
const questionText = readFileSync(new URL('./src/questions.txt', import.meta.url), 'utf8')
  .split('\n|\n')
  .map((block) => block
    .split('\n')
    .filter((line) => !/^\([01]\)/.test(line.trim()))
    .join(' ')
    .replace(/<svg[\s\S]*$/i, '')
    .replace(/<div id="rpt_q93_extra">[\s\S]*$/i, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([?.!,])/g, '$1')
    .trim())
  .filter(Boolean);

if (questionText.length !== stats.questions.length) {
  throw new Error(`Question count ${questionText.length} does not match ${stats.questions.length} rate rows`);
}

const COUNTRY_SCORES = [
  ['Argentina', '0.61%', 57.4],
  ['France', '0.67%', 57.9],
  ['South Africa', '0.57%', 59.2],
  ['Spain', '0.60%', 59.3],
  ['Russia', '0.61%', 59.2],
  ['Mexico', '0.74%', 60.1],
  ['Canada', '3.20%', 61.0],
  ['Brazil', '0.95%', 63.2],
  ['New Zealand', '0.74%', 63.3],
  ['Netherlands', '0.43%', 63.7],
  ['United States', '54.21%', 63.9],
  ['Australia', '2.26%', 64.3],
  ['Italy', '1.76%', 65.4],
  ['Ireland', '1.82%', 65.6],
  ['United Kingdom', '18.69%', 65.7],
  ['Israel', '0.40%', 65.9],
  ['Germany', '0.94%', 66.3],
  ['Japan', '0.56%', 66.6],
].sort((a, b) => a[2] - b[2]);

const AGE_SCORES = [
  ['18–24', 87.36, 89.24],
  ['25–34', 74.05, 79.68],
  ['35–44', 71.03, 71.11],
  ['45–54', 62.83, 67.19],
  ['55–64', 61.12, 66.22],
  ['65+', 58.33, 65.39],
];

const SCORE_BANDS = [
  ['100', 0.75, 0.82],
  ['99–95', 8.32, 9.79],
  ['94–90', 9.19, 9.52],
  ['89–70', 26.37, 28.94],
  ['69–50', 25.74, 26.72],
  ['49–20', 18.58, 15.61],
  ['19–10', 4.79, 3.19],
  ['9–1', 5.71, 4.89],
  ['0', 0.55, 0.52],
];

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CURATED = [
  'Argentina', 'France', 'Spain', 'Italy', 'Poland', 'Brazil', 'Mexico',
  'United States', 'United Kingdom', 'Germany', 'Canada', 'Australia',
  'Netherlands', 'Russia', 'Thailand', 'Indonesia', 'South Korea', 'Japan',
];
const columnIndex = Object.fromEntries(stats.columns.map((name, index) => [name, index]));
const overallIndex = columnIndex.Overall;
const maleIndex = columnIndex.Male;
const femaleIndex = columnIndex.Female;

const payload = {
  curated: CURATED,
  questions: stats.questions.map((question, index) => ({
    n: question.n,
    text: questionText[index],
    overall: Number(question.rates[overallIndex]),
    male: Number(question.rates[maleIndex]),
    female: Number(question.rates[femaleIndex]),
    rates: Object.fromEntries(CURATED.map((name) => [name, Number(question.rates[columnIndex[name]])])),
  })),
  scores: COUNTRY_SCORES.map(([name, share, score]) => ({ name, share, score })),
  ages: AGE_SCORES.map(([label, men, women]) => ({ label, men, women })),
  bands: SCORE_BANDS.map(([label, men, women]) => ({ label, men, women })),
};

const questions = payload.questions.map((question) => `<details class="q" data-n="${question.n}">
  <summary>
    <span class="qn">${question.n}</span>
    <span class="qt">${esc(question.text)}</span>
    <b class="qp">${question.overall.toFixed(1)}%</b>
  </summary>
  <div class="qchart" id="qchart-${question.n}"></div>
</details>`).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rice Purity Test Data</title>
<meta name="description" content="Rice Purity Test scores by age and country, and how often each item is checked. Sampled before June 27, 2022. No personal markers.">
<link rel="canonical" href="https://www.arealme.com/rice-purity-test/data/">
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"></script>
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #f4e4c4; color: #24180f; font: 17px/1.45 Palatino, "Palatino Linotype", Georgia, serif; }
  main { max-width: 72rem; margin: 0 auto; padding: 1.6rem 1.4rem 3rem; }
  .stamp { margin: 0; text-align: center; color: #c41616; font-family: "Snell Roundhand", "Segoe Script", "Brush Script MT", cursive; font-size: 1.7rem; transform: rotate(-7deg); }
  h1 { display: flex; align-items: center; justify-content: center; gap: .7rem; margin: .2rem 0 .3rem; font-size: 2.2rem; font-weight: 500; letter-spacing: .01em; }
  h1 i { flex: 1; max-width: 4.5rem; border-top: 3px solid #1a120c; border-bottom: 1px solid #1a120c; height: 0; }
  .back { text-align: center; margin: 0 0 1.4rem; }
  .back a { color: #1a120c; }
  h2 { text-align: center; font-size: 1.35rem; margin: 2.4rem 0 .4rem; }
  .note, .about p { color: #3a2d20; font-size: 1.02rem; }
  .note { text-align: center; margin: .2rem auto 1rem; max-width: 44rem; }
  .about { max-width: 44rem; margin: 0 auto 1.2rem; }
  .about p { margin: .45rem 0; }
  .controls, .presets { display: flex; flex-wrap: wrap; justify-content: center; gap: .55rem; margin: .4rem 0 .8rem; }
  select, .presets button, .find {
    font: inherit; color: inherit; background: #f4e4c4; border: 1px solid #1a120c; padding: .35rem .6rem;
  }
  .presets button { cursor: pointer; }
  .chart { width: 100%; height: 560px; }
  #age-chart, #band-chart { height: 340px; }
  #score-chart { height: 460px; }
  .find { display: block; width: min(36rem, 100%); margin: .4rem auto 1rem; box-sizing: border-box; }
  .q { border-bottom: 1px solid #e3d2a4; padding: .45rem 0; }
  summary { cursor: pointer; list-style: none; display: flex; align-items: baseline; gap: .7rem; }
  summary::-webkit-details-marker { display: none; }
  .qn { width: 1.8rem; color: #6d5b42; flex: none; }
  .qt { flex: 1; }
  .qp { width: 4.2rem; text-align: right; flex: none; font-weight: 500; }
  .qchart { width: 100%; height: 520px; }
</style>
</head>
<body>
<main>
  <p class="stamp">Rice Thresher Version</p>
  <h1><i></i>Rice Purity Test Data<i></i></h1>
  <p class="back"><a href="https://www.arealme.com/rice-purity-test/en/">Rice Purity Test</a></p>
  <section class="about">
    <p>These figures were recorded before June 27, 2022. After that date, privacy rules in the European Union, and changes in what Google Analytics will store, made this kind of breakdown impractical to keep recording.</p>
    <p>The sample is large enough to show stable patterns. Every figure is a sample. None of it is tied to a name, an account, or any other personal marker, so this page cannot identify anyone.</p>
  </section>

  <h2 id="openness">How often each country checked yes</h2>
  <div id="open-chart" class="chart"></div>
  <p class="note">Average across all 100 items. A longer bar means more of the list was checked, so the purity score sits lower. Japan and South Korea sit far below France, Spain, and Argentina.</p>

  <h2 id="compare">Compare two countries</h2>
  <div class="presets">
    <button type="button" data-a="France" data-b="Japan">France vs Japan</button>
    <button type="button" data-a="Argentina" data-b="South Korea">Argentina vs South Korea</button>
    <button type="button" data-a="Spain" data-b="Japan">Spain vs Japan</button>
  </div>
  <div class="controls">
    <select id="country-a" aria-label="First country"></select>
    <select id="country-b" aria-label="Second country"></select>
  </div>
  <div id="compare-chart" class="chart"></div>
  <p class="note">The 16 items with the widest gap. A bar to the right means the first country checked yes more often.</p>

  <h2 id="age">Average score by age</h2>
  <div id="age-chart" class="chart"></div>
  <p class="note">A higher score means fewer items checked. Younger groups score higher.</p>

  <h2 id="distribution">Score distribution</h2>
  <div id="band-chart" class="chart"></div>
  <p class="note">Share of scores in each band.</p>

  <h2 id="country">Average score by country</h2>
  <div id="score-chart" class="chart"></div>
  <p class="note">Published country averages from a 15% sample of about 20,000 results. This is the score, not the yes rate above. South Korea is in the item charts. It was not in this score table.</p>

  <h2 id="questions">Each item, by country</h2>
  <input class="find" type="search" placeholder="Find a question" aria-label="Find a question">
  <div id="questions">${questions}</div>
</main>
<script id="rpt-data" type="application/json">${JSON.stringify(payload)}</script>
<script>
  const data = JSON.parse(document.getElementById('rpt-data').textContent);
  const ink = '#24180f';
  const paper = 'transparent';
  const font = 'Palatino, Georgia, serif';
  const textStyle = { color: ink, fontFamily: font };
  const axis = { axisLabel: textStyle, axisLine: { lineStyle: { color: '#c4b48a' } }, splitLine: { lineStyle: { color: '#e6d7b4' } } };
  const charts = [];
  function mount(id) {
    const chart = echarts.init(document.getElementById(id));
    charts.push(chart);
    return chart;
  }
  function meanYes(name) {
    const total = data.questions.reduce((sum, question) => sum + question.rates[name], 0);
    return total / data.questions.length;
  }
  const openOrder = data.curated.slice().sort((a, b) => meanYes(a) - meanYes(b));
  mount('open-chart').setOption({
    backgroundColor: paper,
    textStyle,
    grid: { left: 128, right: 56, top: 12, bottom: 28 },
    tooltip: { trigger: 'axis', valueFormatter: (value) => value.toFixed(1) + '%' },
    xAxis: { type: 'value', max: 40, ...axis, axisLabel: { ...textStyle, formatter: '{value}%' } },
    yAxis: { type: 'category', data: openOrder, ...axis },
    series: [{
      type: 'bar',
      data: openOrder.map((name) => ({
        value: meanYes(name),
        itemStyle: { color: ['Japan', 'South Korea'].includes(name) ? '#1a120c' : ['France', 'Spain', 'Argentina'].includes(name) ? '#a33b3b' : '#3f4f38' },
      })),
      label: { show: true, position: 'right', formatter: (item) => item.value.toFixed(1) + '%', color: ink, fontFamily: font },
    }],
  });

  const selectA = document.getElementById('country-a');
  const selectB = document.getElementById('country-b');
  data.curated.forEach((name) => {
    selectA.add(new Option(name, name));
    selectB.add(new Option(name, name));
  });
  selectA.value = 'France';
  selectB.value = 'Japan';
  const compareChart = mount('compare-chart');
  function renderCompare() {
    const left = selectA.value;
    const right = selectB.value;
    const rows = data.questions.map((question) => ({
      label: question.n + '  ' + question.text.replace(/\\?$/, ''),
      gap: question.rates[left] - question.rates[right],
    })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 16);
    rows.reverse();
    compareChart.setOption({
      backgroundColor: paper,
      textStyle,
      grid: { left: 280, right: 48, top: 12, bottom: 28 },
      tooltip: { trigger: 'axis', valueFormatter: (value) => (value > 0 ? '+' : '') + value.toFixed(1) + ' pp' },
      xAxis: { type: 'value', ...axis, axisLabel: { ...textStyle, formatter: (value) => (value > 0 ? '+' : '') + value } },
      yAxis: { type: 'category', data: rows.map((row) => row.label), ...axis, axisLabel: { ...textStyle, width: 260, overflow: 'truncate' } },
      series: [{
        type: 'bar',
        data: rows.map((row) => ({ value: row.gap, itemStyle: { color: row.gap >= 0 ? '#a33b3b' : '#1a120c' } })),
      }],
    });
  }
  selectA.addEventListener('change', () => { renderCompare(); refreshOpen(); });
  selectB.addEventListener('change', () => { renderCompare(); refreshOpen(); });
  document.querySelectorAll('.presets button').forEach((button) => {
    button.addEventListener('click', () => {
      selectA.value = button.dataset.a;
      selectB.value = button.dataset.b;
      renderCompare();
      refreshOpen();
    });
  });
  renderCompare();

  mount('age-chart').setOption({
    backgroundColor: paper,
    textStyle,
    legend: { textStyle, top: 0 },
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.ages.map((row) => row.label), ...axis },
    yAxis: { type: 'value', min: 50, max: 100, ...axis },
    series: [
      { name: 'Men', type: 'bar', data: data.ages.map((row) => row.men), itemStyle: { color: '#1a120c' } },
      { name: 'Women', type: 'bar', data: data.ages.map((row) => row.women), itemStyle: { color: '#a33b3b' } },
    ],
  });
  mount('band-chart').setOption({
    backgroundColor: paper,
    textStyle,
    legend: { textStyle, top: 0 },
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    tooltip: { trigger: 'axis', valueFormatter: (value) => value.toFixed(2) + '%' },
    xAxis: { type: 'category', data: data.bands.map((row) => row.label), ...axis },
    yAxis: { type: 'value', ...axis, axisLabel: { ...textStyle, formatter: '{value}%' } },
    series: [
      { name: 'Men', type: 'bar', data: data.bands.map((row) => row.men), itemStyle: { color: '#1a120c' } },
      { name: 'Women', type: 'bar', data: data.bands.map((row) => row.women), itemStyle: { color: '#a33b3b' } },
    ],
  });
  const scoreOrder = data.scores.slice().sort((a, b) => a.score - b.score);
  mount('score-chart').setOption({
    backgroundColor: paper,
    textStyle,
    grid: { left: 128, right: 72, top: 12, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value', min: 50, max: 70, ...axis },
    yAxis: { type: 'category', data: scoreOrder.map((row) => row.name), ...axis },
    series: [{
      type: 'bar',
      data: scoreOrder.map((row) => row.score),
      itemStyle: { color: '#3f4f38' },
      label: { show: true, position: 'right', formatter: (item) => item.value.toFixed(1), color: ink, fontFamily: font },
    }],
  });

  const questionCharts = new Map();
  function renderQuestion(detail) {
    const number = Number(detail.dataset.n);
    const question = data.questions.find((item) => item.n === number);
    const box = detail.querySelector('.qchart');
    let chart = questionCharts.get(number);
    if (!chart) {
      chart = echarts.init(box);
      questionCharts.set(number, chart);
      charts.push(chart);
    }
    const order = data.curated.slice().sort((a, b) => question.rates[a] - question.rates[b]);
    const pinned = new Set([selectA.value, selectB.value]);
    chart.setOption({
      backgroundColor: paper,
      textStyle,
      grid: { left: 128, right: 56, top: 12, bottom: 24 },
      tooltip: { trigger: 'axis', valueFormatter: (value) => value.toFixed(1) + '%' },
      xAxis: { type: 'value', max: 100, ...axis, axisLabel: { ...textStyle, formatter: '{value}%' } },
      yAxis: { type: 'category', data: order, ...axis },
      series: [{
        type: 'bar',
        data: order.map((name) => ({
          value: question.rates[name],
          itemStyle: { color: pinned.has(name) ? '#a33b3b' : '#3f4f38' },
        })),
        label: { show: true, position: 'right', formatter: (item) => item.value.toFixed(1) + '%', color: ink, fontFamily: font },
      }],
    });
  }
  function refreshOpen() {
    document.querySelectorAll('.q[open]').forEach(renderQuestion);
  }
  document.querySelectorAll('.q').forEach((detail) => {
    detail.addEventListener('toggle', () => {
      if (detail.open) renderQuestion(detail);
    });
  });
  const input = document.querySelector('.find');
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    document.querySelectorAll('.q').forEach((row) => {
      row.hidden = query.length > 0 && !row.querySelector('.qt').textContent.toLowerCase().includes(query);
    });
  });
  window.addEventListener('resize', () => charts.forEach((chart) => chart.resize()));
</script>
</body>
</html>
`;

mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/index.html', import.meta.url), html);
console.log('dist/index.html', html.length);
