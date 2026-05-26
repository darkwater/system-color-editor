const elem = typeof document === "undefined" ? null : {
    main: document.querySelector<HTMLDivElement>("#main")!,
    sidebar: document.querySelector<HTMLDivElement>("#sidebar")!,
    hosts: document.querySelector<HTMLDivElement>("#hosts")!,
};

const HOSTS_KEY = "hosts";

export function clampChannel(value: number): number {
    return Math.max(0, Math.min(255, Math.trunc(value)));
}

export function normalizeHexInput(raw: string): string | null {
    const trimmed = raw.trim();
    const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (!/^#[0-9a-fA-F]{6}$/.test(prefixed)) return null;
    return prefixed.toLowerCase();
}

export function parseHexColorOrNull(raw: string): { r: number; g: number; b: number } | null {
    const normalized = normalizeHexInput(raw);
    if (!normalized) return null;
    return {
        r: parseInt(normalized.slice(1, 3), 16),
        g: parseInt(normalized.slice(3, 5), 16),
        b: parseInt(normalized.slice(5, 7), 16),
    };
}

export function rgbToHex(r: number, g: number, b: number): string {
    const rr = clampChannel(r).toString(16).padStart(2, "0");
    const gg = clampChannel(g).toString(16).padStart(2, "0");
    const bb = clampChannel(b).toString(16).padStart(2, "0");
    return `#${rr}${gg}${bb}`;
}

export function formatAccentConfig(
    hostname: string,
    foreground: { r: number; g: number; b: number },
    background: { r: number; g: number; b: number },
): string {
    const fgHex = rgbToHex(foreground.r, foreground.g, foreground.b);
    const bgHex = rgbToHex(background.r, background.g, background.b);
    const fgRgb = `${clampChannel(foreground.r)};${clampChannel(foreground.g)};${clampChannel(foreground.b)}`;
    const bgRgb = `${clampChannel(background.r)};${clampChannel(background.g)};${clampChannel(background.b)}`;
    return [
        `ACCENT_HOSTNAME="${hostname}"`,
        `ACCENT_FG_HEX="${fgHex}"`,
        `ACCENT_BG_HEX="${bgHex}"`,
        `ACCENT_FG_RGB="${fgRgb}"`,
        `ACCENT_BG_RGB="${bgRgb}"`,
    ].join("\n");
}

export function formatAccentInstallScript(config: string): string {
    return [
        "cat <<'EOF' | sudo tee /etc/system-colors >/dev/null",
        config,
        "EOF",
    ].join("\n");
}

class Host {
    id: number;
    name: string = "new-host";
    foreground: Color = Color.white;
    background: Color = Color.black;

    constructor(id: number) {
        this.id = id;
    }

    static fromObject(obj: any): Host {
        const host = new Host(obj.id);
        host.name = obj.name || "new-host";
        host.foreground = obj.foreground ? Color.fromObject(obj.foreground) : Color.white;
        host.background = obj.background ? Color.fromObject(obj.background) : Color.black;
        return host;
    }
}

class Color {
    r: number = 0;
    g: number = 0;
    b: number = 0;

    static white = new Color(255, 255, 255);
    static black = new Color(0, 0, 0);

    constructor(r: number, g: number, b: number) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    toHex(): string {
        return rgbToHex(this.r, this.g, this.b);
    }

    static fromHex(hex: string): Color {
        const parsed = parseHexColorOrNull(hex);
        if (!parsed) return new Color(0, 0, 0);
        return new Color(parsed.r, parsed.g, parsed.b);
    }

    static fromObject(obj: any): Color {
        return new Color(obj.r || 0, obj.g || 0, obj.b || 0);
    }
}

let hosts: Host[] = getStoredHosts();
// let selectedHostId: number | null = null;

function getStoredHosts(): Host[] {
    if (typeof localStorage === "undefined") return [];
    const serialized = localStorage.getItem(HOSTS_KEY);
    if (serialized) {
        try {
            const parsed = JSON.parse(serialized);
            return parsed.map((h: any) => Host.fromObject(h));
        } catch (e) {
            console.error("Failed to parse stored hosts:", e);
            return [];
        }
    } else {
        return [];
    }
}

function storeHosts() {
    if (typeof localStorage === "undefined") return;
    try {
        const serialized = JSON.stringify(hosts);
        localStorage.setItem(HOSTS_KEY, serialized);
    } catch (e) {
        console.error("Failed to store hosts:", e);
    }
}

function populateHostsList() {
    if (!elem) return;
    elem.hosts.innerHTML = "";

    for (const host of hosts) {
        const hostElem = document.createElement("li");
        hostElem.classList.add("host");
        hostElem.addEventListener("click", () => {
            selectHost(host.id);
        });

        const hostElemButton = document.createElement("button");
        hostElem.appendChild(hostElemButton);

        const hostElemPreview = document.createElement("span");
        hostElemPreview.textContent = host.name;
        hostElemPreview.style.backgroundColor = host.background.toHex();
        hostElemPreview.style.color = host.foreground.toHex();
        hostElemPreview.classList.add("preview");
        hostElemButton.appendChild(hostElemPreview);

        elem.hosts.appendChild(hostElem);
    }

    const newHost = document.createElement("li");
    const newHostButton = document.createElement("button");
    newHostButton.classList.add("new-host");
    newHostButton.textContent = "New Host";
    newHostButton.addEventListener("click", () => {
        const newHost = new Host(Date.now());
        hosts.push(newHost);
        selectHost(newHost.id);
        storeHosts();
        populateHostsList();
    });
    newHost.appendChild(newHostButton);
    elem.hosts.appendChild(newHost);
}

function renderColorEditor(host: Host, key: "foreground" | "background"): HTMLElement {
    const section = document.createElement("section");
    section.classList.add("color-panel");

    const heading = document.createElement("h2");
    heading.textContent = key === "foreground" ? "Foreground" : "Background";
    section.appendChild(heading);

    const hexRow = document.createElement("label");
    hexRow.classList.add("hex-row");

    const hexLabel = document.createElement("span");
    hexLabel.textContent = "Hex";
    hexRow.appendChild(hexLabel);

    const hexInput = document.createElement("input");
    hexInput.type = "text";
    hexInput.value = host[key].toHex();
    hexInput.classList.add("hex-input");
    hexRow.appendChild(hexInput);

    section.appendChild(hexRow);

    const pickerRow = document.createElement("label");
    pickerRow.classList.add("picker-row");

    const pickerLabel = document.createElement("span");
    pickerLabel.textContent = "Pick";
    pickerRow.appendChild(pickerLabel);

    const pickerInput = document.createElement("input");
    pickerInput.type = "color";
    pickerInput.value = host[key].toHex();
    pickerRow.appendChild(pickerInput);

    section.appendChild(pickerRow);

    const syncFromColor = () => {
        hexInput.value = host[key].toHex();
        pickerInput.value = host[key].toHex();
        for (const channel of ["r", "g", "b"] as const) {
            const row = section.querySelector<HTMLElement>(`.rgb-row[data-channel="${channel}"]`)!;
            const slider = row.querySelector<HTMLInputElement>('input[type="range"]')!;
            const number = row.querySelector<HTMLInputElement>('input[type="number"]')!;
            slider.value = String(host[key][channel]);
            number.value = String(host[key][channel]);
        }
    };

    hexInput.addEventListener("input", () => {
        const parsed = parseHexColorOrNull(hexInput.value);
        if (!parsed) {
            hexInput.classList.add("invalid");
            return;
        }
        hexInput.classList.remove("invalid");
        host[key] = new Color(parsed.r, parsed.g, parsed.b);
        storeHosts();
        populateHostsList();
        syncFromColor();
    });

    pickerInput.addEventListener("input", () => {
        host[key] = Color.fromHex(pickerInput.value);
        hexInput.classList.remove("invalid");
        storeHosts();
        populateHostsList();
        syncFromColor();
    });

    for (const channel of ["r", "g", "b"] as const) {
        const row = document.createElement("div");
        row.classList.add("rgb-row");
        row.dataset.channel = channel;

        const label = document.createElement("label");
        label.textContent = channel.toUpperCase();
        row.appendChild(label);

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "0";
        slider.max = "255";
        slider.step = "1";
        slider.value = String(host[key][channel]);
        row.appendChild(slider);

        const number = document.createElement("input");
        number.type = "number";
        number.min = "0";
        number.max = "255";
        number.step = "1";
        number.value = String(host[key][channel]);
        row.appendChild(number);

        const applyChannel = (raw: string) => {
            const next = clampChannel(Number(raw));
            const r = channel === "r" ? next : host[key].r;
            const g = channel === "g" ? next : host[key].g;
            const b = channel === "b" ? next : host[key].b;
            host[key] = new Color(r, g, b);
            storeHosts();
            populateHostsList();
            syncFromColor();
        };

        slider.addEventListener("input", () => applyChannel(slider.value));
        number.addEventListener("input", () => applyChannel(number.value));

        section.appendChild(row);
    }

    return section;
}

function renderAccentConfig(host: Host): HTMLElement {
    const container = document.createElement("div");
    container.classList.add("config-sections");

    const configSection = document.createElement("section");
    configSection.classList.add("config-panel");

    const heading = document.createElement("h2");
    heading.textContent = "Accent Config";
    configSection.appendChild(heading);

    const output = document.createElement("textarea");
    output.readOnly = true;
    const accentConfig = formatAccentConfig(host.name, host.foreground, host.background);
    output.value = accentConfig;
    output.classList.add("config-output");
    configSection.appendChild(output);

    const copyButton = document.createElement("button");
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(output.value);
            copyButton.textContent = "Copied";
            setTimeout(() => {
                copyButton.textContent = "Copy";
            }, 1200);
        } catch (e) {
            console.error("Failed to copy config:", e);
        }
    });
    configSection.appendChild(copyButton);

    const installSection = document.createElement("section");
    installSection.classList.add("install-panel");

    const installHeading = document.createElement("h2");
    installHeading.textContent = "Install Command";
    installSection.appendChild(installHeading);

    const installOutput = document.createElement("textarea");
    installOutput.readOnly = true;
    installOutput.value = formatAccentInstallScript(accentConfig);
    installOutput.classList.add("config-output");
    installSection.appendChild(installOutput);

    const copyInstallButton = document.createElement("button");
    copyInstallButton.textContent = "Copy Install Command";
    copyInstallButton.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(installOutput.value);
            copyInstallButton.textContent = "Copied";
            setTimeout(() => {
                copyInstallButton.textContent = "Copy Install Command";
            }, 1200);
        } catch (e) {
            console.error("Failed to copy install command:", e);
        }
    });
    installSection.appendChild(copyInstallButton);

    container.appendChild(configSection);
    container.appendChild(installSection);

    return container;
}

function selectHost(id: number | null) {
    if (!elem) return;
    elem.main.innerHTML = "";
    if (id === null) return;

    const host = hosts.find(h => h.id === id);
    if (!host) return;

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = host.name;
    nameInput.addEventListener("input", () => {
        host.name = nameInput.value;
        storeHosts();
        populateHostsList();
    });
    elem.main.appendChild(nameInput);

    const actions = document.createElement("div");
    actions.classList.add("editor-actions");

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete Host";
    deleteButton.addEventListener("click", () => {
        hosts = hosts.filter(h => h.id !== id);
        storeHosts();
        populateHostsList();
        selectHost(null);
    });
    actions.appendChild(deleteButton);

    const swapButton = document.createElement("button");
    swapButton.textContent = "Swap FG/BG";
    swapButton.addEventListener("click", () => {
        const oldFg = host.foreground;
        host.foreground = host.background;
        host.background = oldFg;
        storeHosts();
        populateHostsList();
        selectHost(host.id);
    });
    actions.appendChild(swapButton);

    elem.main.appendChild(actions);
    elem.main.appendChild(renderColorEditor(host, "foreground"));
    elem.main.appendChild(renderColorEditor(host, "background"));
    elem.main.appendChild(renderAccentConfig(host));
}

if (elem) {
    populateHostsList();
}

// backup messes with deno bundle --watch
// vim: nobackup
