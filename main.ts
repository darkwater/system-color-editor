const elem = {
    main: document.querySelector<HTMLDivElement>("#main")!,
    sidebar: document.querySelector<HTMLDivElement>("#sidebar")!,
    hosts: document.querySelector<HTMLDivElement>("#hosts")!,
};

const HOSTS_KEY = "hosts";

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
        return "#" +
            this.r.toString(16).padStart(2, "0") +
            this.g.toString(16).padStart(2, "0") +
            this.b.toString(16).padStart(2, "0");
    }

    static fromHex(hex: string): Color {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return new Color(r, g, b);
    }

    static fromObject(obj: any): Color {
        return new Color(obj.r || 0, obj.g || 0, obj.b || 0);
    }
}

let hosts: Host[] = getStoredHosts();
// let selectedHostId: number | null = null;

function getStoredHosts(): Host[] {
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
    try {
        const serialized = JSON.stringify(hosts);
        localStorage.setItem(HOSTS_KEY, serialized);
    } catch (e) {
        console.error("Failed to store hosts:", e);
    }
}

function populateHostsList() {
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

function selectHost(id: number | null) {
    elem.main.innerHTML = "";
    if (id === null) return;

    const host = hosts.find(h => h.id === id);
    if (!host) return;

    const nameInput = document.createElement("input");
    nameInput.value = host.name;
    nameInput.addEventListener("input", () => {
        host.name = nameInput.value;
        storeHosts();
        populateHostsList();
    });
    elem.main.appendChild(nameInput);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete Host";
    deleteButton.addEventListener("click", () => {
        hosts = hosts.filter(h => h.id !== id);
        storeHosts();
        populateHostsList();
        selectHost(null);
    });
    elem.main.appendChild(deleteButton);

    for (const color of ["background", "foreground"] as const) {
        const foregroundInput = document.createElement("input");
        foregroundInput.type = "color";
        foregroundInput.value = host[color].toHex();
        foregroundInput.addEventListener("input", () => {
            const hex = foregroundInput.value;
            host[color] = Color.fromHex(hex);
            storeHosts();
            populateHostsList();
        });
        elem.main.appendChild(foregroundInput);
    }
}

populateHostsList();

// backup messes with deno bundle --watch
// vim: nobackup
