const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const locationDiv = document.getElementById("location");
const weatherDiv = document.getElementById("weather");
const forecastDiv = document.getElementById("forecast");
const datetimeDiv = document.getElementById("datetime");
const suggestionsDiv = document.getElementById("suggestions");
const themeToggle = document.getElementById("themeToggle");
const voiceBtn = document.getElementById("voiceBtn");
const reminderForm = document.getElementById("reminderForm");
const reminderList = document.getElementById("reminderList");
const suggestionsList = document.getElementById("suggestionsList");

let previousSearches = [];
const reminderTimeouts = new Map();

function saveData() {
  const reminders = [];
  reminderList.querySelectorAll("li").forEach((li) => {
    reminders.push({
      id: li.dataset.id,
      fullText: li.textContent.replace("×", "").trim(),
      type: li.className,
      text: li.textContent.split("]")[1]?.split("-")[0]?.trim() || "",
      date: li.textContent.split("-").pop()?.trim() || "",
    });
  });

  const data = {
    previousSearches,
    reminders,
  };
  localStorage.setItem("climaRotinaData", JSON.stringify(data));
}

function loadData() {
  const saved = localStorage.getItem("climaRotinaData");
  if (!saved) return;

  try {
    const data = JSON.parse(saved);

    previousSearches = data.previousSearches || [];
    updateSuggestionsDatalist();

    reminderTimeouts.forEach((to) => clearTimeout(to));
    reminderTimeouts.clear();
    reminderList.innerHTML = "";

    if (data.reminders?.length) {
      data.reminders.forEach((r) => {
        const li = document.createElement("li");
        li.className = r.type || "";
        li.dataset.id = r.id;
        li.textContent = `[${r.type.replace(/-/g, " ")}] ${r.text || ""} - ${
          r.date || ""
        }`;

        const delBtn = document.createElement("button");
        delBtn.className = "del-btn";
        delBtn.title = "Excluir lembrete";
        delBtn.innerHTML = "&#10006;";
        delBtn.onclick = () => {
          clearTimeout(reminderTimeouts.get(r.id));
          reminderTimeouts.delete(r.id);
          li.remove();
          saveData();
        };

        li.appendChild(delBtn);
        reminderList.appendChild(li);

        const delay = new Date(r.date).getTime() - Date.now();
        if (delay > 0) {
          const timeoutId = setTimeout(() => {
            alert(`🔔 Lembrete: ${r.text}`);
            reminderTimeouts.delete(r.id);
            const item = reminderList.querySelector(`li[data-id="${r.id}"]`);
            if (item) item.remove();
            saveData();
          }, delay);
          reminderTimeouts.set(r.id, timeoutId);
        }
      });
    }
  } catch {
    console.warn("Erro ao carregar dados do localStorage");
  }
}

function updateSuggestionsDatalist() {
  suggestionsList.innerHTML = "";
  previousSearches.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    suggestionsList.appendChild(option);
  });
}

function updateDateTime() {
  const now = new Date();
  datetimeDiv.textContent = now.toLocaleString("pt-BR");
}
setInterval(updateDateTime, 1000);
updateDateTime();

themeToggle.addEventListener("click", () => {
  if (document.body.classList.contains("dark")) {
    document.body.classList.remove("dark");
    document.body.classList.add("neon");
  } else if (document.body.classList.contains("neon")) {
    document.body.classList.remove("neon");
  } else {
    document.body.classList.add("dark");
  }
});

async function fetchWeather(city) {
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        city
      )}&limit=1`
    );
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error("Cidade não encontrada");

    const { lat, lon, display_name } = geoData[0];
    locationDiv.textContent = display_name;

    if (!previousSearches.includes(display_name)) {
      previousSearches.push(display_name);
      updateSuggestionsDatalist();
      saveData();
    }

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&timezone=auto`
    );
    const weather = await weatherRes.json();

    const now = new Date();
    const currentISOHour = now.toISOString().slice(0, 13) + ":00";
    const index = weather.hourly.time.findIndex((t) => t === currentISOHour);
    if (index === -1) throw new Error("Dados de clima indisponíveis agora");

    const temp = weather.hourly.temperature_2m[index];
    const code = weather.hourly.weathercode[index];

    weatherDiv.innerHTML = `Temperatura: ${temp}°C<br>Clima: ${translateWeather(
      code
    )}`;

    forecastDiv.innerHTML = "";
    for (
      let i = index;
      i < index + 8 && i < weather.hourly.time.length;
      i += 3
    ) {
      const t = weather.hourly.temperature_2m[i];
      const c = translateWeather(weather.hourly.weathercode[i]);
      const hour = new Date(weather.hourly.time[i]).getHours();
      forecastDiv.innerHTML += `<div><strong>${hour}h</strong><br>${t}°C<br>${c}</div>`;
    }

    buildSuggestions(temp, code);

    if ([95, 96, 99].includes(code)) {
      alert("⚠️ Alerta de clima extremo!");
    }
  } catch (err) {
    weatherDiv.textContent = err.message;
    forecastDiv.innerHTML = "";
    locationDiv.textContent = "";
    suggestionsDiv.innerHTML = "";
  }
}

function translateWeather(code) {
  const codes = {
    0: "Céu limpo",
    1: "Sol",
    2: "Parcial",
    3: "Nublado",
    45: "Névoa",
    48: "Neblina",
    51: "Garoa",
    61: "Chuva leve",
    63: "Chuva",
    65: "Chuva forte",
    80: "Pancadas",
    95: "Tempestade",
    96: "Trovoadas",
    99: "Tempestade severa",
  };
  return codes[code] || "Desconhecido";
}

function buildSuggestions(temp, code) {
  const hour = new Date().getHours();
  const isDay = hour > 6 && hour < 18;
  let msg = [];

  if (temp >= 30) msg.push("Evite sair, muito calor. Hidrate-se.");
  else if (temp <= 10) msg.push("Vista roupas quentes.");
  else msg.push("Temperatura agradável, aproveite!");

  if ([61, 63, 65, 80].includes(code)) msg.push("Leve guarda-chuva!");
  if (isDay && code === 0) msg.push("Perfeito para caminhada ao ar livre.");
  if (!isDay) msg.push("Aproveite pra relaxar ou estudar.");

  suggestionsDiv.innerHTML = msg.map((m) => `<div>• ${m}</div>`).join("");
}

searchBtn.onclick = () => {
  if (cityInput.value.trim()) fetchWeather(cityInput.value.trim());
};

voiceBtn.onclick = () => {
  const recognition =
    new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "pt-BR";
  recognition.start();
  recognition.onresult = (e) => {
    cityInput.value = e.results[0][0].transcript;
    fetchWeather(cityInput.value);
  };
};

reminderForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const text = document.getElementById("reminderText").value.trim();
  const time = document.getElementById("reminderTime").value;
  const type = document.getElementById("activityType").value;

  if (!text || !time) return alert("Preencha texto e data/hora do lembrete");

  const id = Date.now().toString();

  const li = document.createElement("li");
  li.classList.add(type.toLowerCase().replace(/\s/g, "-"));
  li.dataset.id = id;

  li.textContent = `[${type}] ${text} - ${new Date(time).toLocaleString("pt-BR")}`;

  const delBtn = document.createElement("button");
  delBtn.className = "del-btn";
  delBtn.title = "Excluir lembrete";
  delBtn.innerHTML = "&#10006;";
  delBtn.onclick = () => {
    clearTimeout(reminderTimeouts.get(id));
    reminderTimeouts.delete(id);
    li.remove();
    saveData();
  };

  li.appendChild(delBtn);
  reminderList.appendChild(li);

  const delay = new Date(time).getTime() - Date.now();
  if (delay > 0) {
    const timeoutId = setTimeout(() => {
      alert(`🔔 Lembrete: ${text}`);
      reminderTimeouts.delete(id);
      const item = reminderList.querySelector(`li[data-id="${id}"]`);
      if (item) item.remove();
      saveData();
    }, delay);
    reminderTimeouts.set(id, timeoutId);
  }

  reminderForm.reset();
  saveData();
});

window.onload = () => {
  loadData();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );
          const data = await res.json();
          if (data.address) {
            let cityName =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.county ||
              "";

            if (cityName) {
              cityInput.value = cityName;
              fetchWeather(cityName);
            }
          }
        } catch {
          console.warn("Não foi possível obter cidade pela localização.");
        }
      },
      () => console.warn("Permissão para localização negada ou indisponível")
    );
  }
};