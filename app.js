const DATA_SOURCES = {
  amenagements: {
    label: "Aménagements cyclables",
    itemId: "3bdca8302376475c8260db020549826e",
    arcgisUrl: "https://www.arcgis.com/sharing/rest/content/items/3bdca8302376475c8260db020549826e/data",
    localUrl: "data/amenagements_cyclables_montreuil_suivi.geojson",
  },
  quartiers: {
    label: "Quartiers",
    itemId: "57cd71e3000941f79a68da9929547cfe",
    arcgisUrl: "https://www.arcgis.com/sharing/rest/content/items/57cd71e3000941f79a68da9929547cfe/data",
    localUrl: "data/quartiers_montreuil.geojson",
  },
  arceaux: {
    label: "Stationnements avec arceaux",
    itemId: "117f60af802f471ba21f00bb6cc61aaf",
    arcgisUrl: "https://www.arcgis.com/sharing/rest/content/items/117f60af802f471ba21f00bb6cc61aaf/data",
    localUrl: "data/arceaux_velo_montreuil.geojson",
  },
  velobox: {
    label: "Vélobox",
    itemId: "61f678a9a63a45fbbd00c87ed852b7c8",
    arcgisUrl: "https://www.arcgis.com/sharing/rest/content/items/61f678a9a63a45fbbd00c87ed852b7c8/data",
    localUrl: "data/velobox_montreuil.geojson",
  },
};

const ARCGIS_WEBMAP_URL = "https://www.arcgis.com/apps/mapviewer/index.html?webmap=6d0277782d2b4c9cb45f238172a0dfd9";

const TYPE_COLORS = {
  "Piste cyclable": "#0b6b57",
  "Bande cyclable": "#209b7d",
  "Double-sens cyclable": "#4fb99a",
  "Zone de rencontre": "#8f98a3",
  "Voie bus ouverte aux vélos": "#f28c28",
  "Aménagement cyclable": "#2c7da0",
  "Autre / à qualifier": "#7d8790",
};

const state = {
  data: {},
  sourceStatus: {},
  selectedType: "all",
  selectedYear: "all",
  layers: {},
  charts: {},
};

const formatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function clean(value, fallback = "Inconnue") {
  return value === null || value === undefined || value === "" || value === "None" ? fallback : value;
}

function featureLength(feature) {
  const raw = Number(feature.properties?.longueur_m ?? feature.properties?.longueur_src ?? 0);
  if (Number.isFinite(raw) && raw > 0) return raw;
  if (window.turf?.length && feature.geometry) {
    return window.turf.length(feature, { units: "kilometers" }) * 1000;
  }
  return 0;
}

function timeClass(feature) {
  const p = feature.properties || {};
  if (p.periode_documentee) return `Période documentée ${p.periode_documentee}`;
  return "Non renseignée";
}

function typeClass(feature) {
  return clean(feature.properties?.type_amenagement, "Autre / à qualifier");
}

function colorForType(type) {
  return TYPE_COLORS[type] || TYPE_COLORS["Autre / à qualifier"];
}

function matchesFilters(feature) {
  const typeOk = state.selectedType === "all" || typeClass(feature) === state.selectedType;
  const yearOk = state.selectedYear === "all" || timeClass(feature) === state.selectedYear;
  return typeOk && yearOk;
}

function metadataUrl(itemId) {
  return `https://www.arcgis.com/sharing/rest/content/items/${itemId}?f=json`;
}

function isValidGeoJson(data) {
  return Boolean(data && data.type === "FeatureCollection" && Array.isArray(data.features));
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchMetadata(source) {
  try {
    const meta = await fetchJson(metadataUrl(source.itemId));
    return {
      title: meta.title,
      modified: Number.isFinite(meta.modified) ? new Date(meta.modified) : null,
      access: meta.access,
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function loadLayer(key, source) {
  const metadataPromise = fetchMetadata(source);

  try {
    const data = await fetchJson(source.arcgisUrl);
    if (!isValidGeoJson(data)) throw new Error("GeoJSON ArcGIS invalide");
    return [key, { data, origin: "arcgis", url: source.arcgisUrl, metadata: await metadataPromise }];
  } catch (arcgisError) {
    const data = await fetchJson(source.localUrl);
    if (!isValidGeoJson(data)) throw new Error(`GeoJSON local invalide pour ${source.label}`);
    return [
      key,
      {
        data,
        origin: "local",
        url: source.localUrl,
        metadata: await metadataPromise,
        fallbackReason: arcgisError.message,
      },
    ];
  }
}

async function loadData() {
  const results = await Promise.allSettled(
    Object.entries(DATA_SOURCES).map(([key, source]) => loadLayer(key, source))
  );
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) {
    throw new Error(failures.map((failure) => failure.reason.message).join(" ; "));
  }

  state.data = {};
  state.sourceStatus = {};
  results.forEach((result) => {
    const [key, payload] = result.value;
    state.data[key] = payload.data;
    state.sourceStatus[key] = payload;
  });
}

function initMap() {
  state.map = L.map("map", {
    zoomControl: false,
    preferCanvas: true,
  }).setView([48.861, 2.443], 13);

  L.control.zoom({ position: "bottomright" }).addTo(state.map);

  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 16,
    attribution:
      "Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, FAO, NOAA, USGS, &copy; OpenStreetMap contributors, GIS User Community",
  }).addTo(state.map);

  state.layers.quartiers = L.geoJSON(state.data.quartiers, {
    style: {
      color: "#0b6b57",
      weight: 1,
      opacity: 0.35,
      fillOpacity: 0.02,
    },
    interactive: false,
  }).addTo(state.map);

  state.layers.arceaux = L.geoJSON(state.data.arceaux, {
    pointToLayer: (feature, latlng) =>
      L.circleMarker(latlng, {
        radius: 4,
        color: "#4f6873",
        fillColor: "#ffffff",
        fillOpacity: 0.9,
        weight: 1,
      }).bindPopup(arceauPopup(feature)),
  });

  state.layers.velobox = L.geoJSON(state.data.velobox, {
    pointToLayer: (feature, latlng) =>
      L.circleMarker(latlng, {
        radius: 6,
        color: "#ffffff",
        fillColor: "#0b6b57",
        fillOpacity: 0.85,
        weight: 2,
      }).bindPopup(veloboxPopup(feature)),
  }).addTo(state.map);

  state.layers.amenagements = L.geoJSON(null, {
    style: lineStyle,
    onEachFeature: onLineFeature,
  }).addTo(state.map);

  state.map.removeLayer(state.layers.arceaux);

  const bounds = L.geoJSON(state.data.quartiers).getBounds();
  if (bounds.isValid()) state.map.fitBounds(bounds.pad(0.08));
  else state.map.setView([48.861, 2.443], 13);

  setTimeout(() => {
    state.map.invalidateSize();
    if (bounds.isValid()) state.map.fitBounds(bounds.pad(0.08));
  }, 250);
}

function lineStyle(feature) {
  const type = typeClass(feature);
  return {
    color: colorForType(type),
    weight: 5,
    opacity: 0.9,
    lineCap: "round",
  };
}

function onLineFeature(feature, layer) {
  layer.on("click", () => {
    showDetails(feature);
    layer.setStyle({ weight: 8, opacity: 1 });
    setTimeout(() => state.layers.amenagements.resetStyle(layer), 1200);
  });
  layer.bindPopup(popupHtml(feature));
}

function popupHtml(feature) {
  const p = feature.properties || {};
  return `
    <h3 class="popup-title">${clean(p.nom_voie, "Tronçon cyclable")}</h3>
    <p class="popup-meta"><strong>Type :</strong> ${typeClass(feature)}</p>
    <p class="popup-meta"><strong>Année :</strong> ${timeClass(feature)}</p>
    <p class="popup-meta"><strong>Longueur :</strong> ${formatter.format(featureLength(feature) / 1000)} km</p>
    <p class="popup-meta"><strong>Statut :</strong> ${clean(p.statut_annee)}</p>
  `;
}

function arceauPopup(feature) {
  const p = feature.properties || {};
  return `
    <h3 class="popup-title">Site de stationnement vélo</h3>
    <p class="popup-meta"><strong>Voie :</strong> ${clean([p.type_voie, p.nom_voie, p.num_voie].filter(Boolean).join(" "), "Non renseignée")}</p>
    <p class="popup-meta"><strong>Places déclarées :</strong> ${clean(p.nbr_places, "-")}</p>
    <p class="popup-meta"><strong>Modèle :</strong> ${clean(p.modele, "Non renseigné")}</p>
    <p class="popup-meta"><strong>Source :</strong> ${clean(p.source_donnee, "Montreuil Data")}</p>
  `;
}

function veloboxPopup(feature) {
  const p = feature.properties || {};
  return `
    <h3 class="popup-title">Implantation Vélobox</h3>
    <p class="popup-meta"><strong>Abri :</strong> ${clean(p.abri, "Abri sécurisé")}</p>
    <p class="popup-meta"><strong>Numéro :</strong> ${clean(p.numero, "-")}</p>
    <p class="popup-meta"><strong>Capacité indicative :</strong> ${clean(p.capacite_velos, "-")} vélos</p>
    <p class="popup-meta"><strong>Source :</strong> ${clean(p.source_donnee, "Montreuil Data")}</p>
  `;
}

function showDetails(feature) {
  const p = feature.properties || {};
  document.getElementById("detail-title").textContent = clean(p.nom_voie, "Tronçon cyclable");
  document.getElementById("detail-type").textContent = typeClass(feature);
  document.getElementById("detail-year").textContent = timeClass(feature);
  document.getElementById("detail-length").textContent = `${formatter.format(featureLength(feature) / 1000)} km`;
  document.getElementById("detail-source").textContent = clean(p.source_donnee, "Montreuil Data");
  document.getElementById("details-card").classList.add("is-visible");
}

function populateFilters() {
  const features = state.data.amenagements.features;
  const types = [...new Set(features.map(typeClass))].sort((a, b) => a.localeCompare(b, "fr"));
  const years = [...new Set(features.map(timeClass))].sort((a, b) => {
    if (a === "Non renseignée") return 1;
    if (b === "Non renseignée") return -1;
    return a.localeCompare(b, "fr");
  });

  const typeSelect = document.getElementById("type-filter");
  types.forEach((type) => typeSelect.add(new Option(type, type)));

  const yearSelect = document.getElementById("year-filter");
  years.forEach((year) => yearSelect.add(new Option(year, year)));
}

function filteredFeatures() {
  return state.data.amenagements.features.filter(matchesFilters);
}

function refresh() {
  const features = filteredFeatures();
  const collection = {
    type: "FeatureCollection",
    features,
  };

  state.layers.amenagements.clearLayers().addData(collection);
  updateKpis(features);
  updateCharts(features);
  updateCounter(features.length);
  updateSourceSummary();
}

function updateKpis(features) {
  const km = features.reduce((sum, f) => sum + featureLength(f), 0) / 1000;
  const unknown = features.filter((f) => !f.properties?.annee_realisation).length;
  const documented = features.filter((f) => String(f.properties?.periode_documentee || "") === "2018-2022").length;
  const arceauPlaces = state.data.arceaux.features.reduce((sum, f) => sum + Number(f.properties?.nbr_places || 0), 0);
  const veloboxPlaces = state.data.velobox.features.reduce((sum, f) => sum + Number(f.properties?.capacite_velos || 0), 0);

  document.getElementById("kpi-km").textContent = formatter.format(km);
  document.getElementById("kpi-segments").textContent = features.length;
  document.getElementById("kpi-unknown").textContent = unknown;
  document.getElementById("kpi-period").textContent = documented;
  document.getElementById("kpi-arceaux-sites").textContent = state.data.arceaux.features.length;
  document.getElementById("kpi-arceaux-places").textContent = formatter.format(arceauPlaces);
  document.getElementById("kpi-velobox-sites").textContent = state.data.velobox.features.length;
  document.getElementById("kpi-velobox-places").textContent = formatter.format(veloboxPlaces);
  document.getElementById("ribbon-total").textContent = `${formatter.format(km)} km affichés`;
}

function formatDate(date) {
  return date
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date)
    : "date ArcGIS non disponible";
}

function formatShortDate(date) {
  return date ? new Intl.DateTimeFormat("fr-FR").format(date) : "date ArcGIS non disponible";
}

function updateSourceSummary() {
  const statuses = Object.values(state.sourceStatus);
  const arcgisCount = statuses.filter((status) => status.origin === "arcgis").length;
  const usesFallback = arcgisCount < statuses.length;

  const latestModified = statuses
    .map((status) => status.metadata?.modified)
    .filter(Boolean)
    .sort((a, b) => b - a)[0];
  const details = Object.entries(state.sourceStatus)
    .map(([key, status]) => {
      const source = DATA_SOURCES[key];
      const origin = status.origin === "arcgis" ? "ArcGIS Online" : "copie locale";
      const reason = status.fallbackReason ? `, secours : ${status.fallbackReason}` : "";
      return `${source.label} : ${origin}, ${formatDate(status.metadata?.modified)}${reason}`;
    })
    .join("\n");

  document.getElementById("updated-date").textContent = formatShortDate(latestModified);
  const warning = document.getElementById("source-warning");
  const status = document.getElementById("source-status");
  warning.hidden = !usesFallback;
  status.classList.toggle("has-warning", usesFallback);
  status.title = usesFallback ? details : "";
}

function updateCounter(count) {
  document.getElementById("visible-count").textContent = count;
}

function aggregate(features, keyFn, valueFn = () => 1) {
  return features.reduce((acc, feature) => {
    const key = keyFn(feature);
    acc[key] = (acc[key] || 0) + valueFn(feature);
    return acc;
  }, {});
}

function initCharts() {
  const typeCtx = document.getElementById("type-chart");
  state.charts.type = new Chart(typeCtx, {
    type: "bar",
    data: { labels: [], datasets: [{ label: "km", data: [], backgroundColor: [] }] },
    options: chartOptions("Kilomètres"),
  });
}

function chartOptions(axisTitle) {
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${formatter.format(context.parsed.x ?? context.parsed)} ${axisTitle.toLowerCase()}`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: "#edf1ee" },
        title: { display: true, text: axisTitle },
        ticks: { precision: 0 },
      },
      y: { grid: { display: false }, ticks: { color: "#66736f" } },
    },
  };
}

function updateCharts(features) {
  const byType = aggregate(features, typeClass, (f) => featureLength(f) / 1000);
  const typeLabels = Object.keys(byType).sort((a, b) => byType[b] - byType[a]);
  state.charts.type.data.labels = typeLabels;
  state.charts.type.data.datasets[0].data = typeLabels.map((label) => Number(byType[label].toFixed(2)));
  state.charts.type.data.datasets[0].backgroundColor = typeLabels.map(colorForType);
  state.charts.type.update();
}

function buildLegend() {
  const legend = document.getElementById("legend");
  Object.keys(TYPE_COLORS).forEach((type) => {
    const row = document.createElement("div");
    row.className = "legend-row";
    row.innerHTML = `<span class="legend-swatch" style="background:${TYPE_COLORS[type]}"></span><span>${type}</span>`;
    legend.appendChild(row);
  });
  [
    ["Quartiers", "transparent", "#0b6b57"],
    ["Sites de stationnement avec arceaux", "#ffffff", "#4f6873"],
    ["Vélobox", "#f28c28", "#f28c28"],
  ].forEach(([label, fill, stroke]) => {
    const row = document.createElement("div");
    row.className = "legend-row";
    row.innerHTML = `<span class="legend-swatch" style="background:${fill};border:2px solid ${stroke}"></span><span>${label}</span>`;
    legend.appendChild(row);
  });
}

function bindEvents() {
  document.getElementById("type-filter").addEventListener("change", (event) => {
    state.selectedType = event.target.value;
    refresh();
  });

  document.getElementById("year-filter").addEventListener("change", (event) => {
    state.selectedYear = event.target.value;
    refresh();
  });

  document.getElementById("reset-filters").addEventListener("click", () => {
    state.selectedType = "all";
    state.selectedYear = "all";
    document.getElementById("type-filter").value = "all";
    document.getElementById("year-filter").value = "all";
    document.getElementById("details-card").classList.remove("is-visible");
    refresh();
  });

  document.getElementById("close-details").addEventListener("click", () => {
    document.getElementById("details-card").classList.remove("is-visible");
  });

  document.querySelectorAll("[data-layer-toggle]").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const key = event.target.dataset.layerToggle;
      const layer = state.layers[key];
      if (!layer) return;
      if (event.target.checked) layer.addTo(state.map);
      else state.map.removeLayer(layer);
    });
  });
}

async function main() {
  try {
    await loadData();
    populateFilters();
    initMap();
    initCharts();
    buildLegend();
    bindEvents();
    refresh();
  } catch (error) {
    document.body.innerHTML = `<main class="load-error"><h1>Erreur de chargement</h1><p>${error.message}</p></main>`;
  }
}

main();
