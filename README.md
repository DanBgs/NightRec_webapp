# 🌙 NightRec WebApp

> **NightRec first webapp** — Un'applicazione web moderna e reattiva progettata per ottimizzare la gestione, il monitoraggio o la registrazione delle proprie attività, con particolare focus sulla gestione dei dati e su un'interfaccia utente curata.[cite: 1]

---

## 📋 Indice
1. [Panoramica del Progetto](#-panoramica-del-progetto)
2. [Tecnologie e Stack Tecnologico](#-tecnologie-e-stack-tecnologico)
3. [Struttura dei File e della Repository](#-struttura-dei-file-e-della-repository)
4. [Requisiti di Sistema](#-requisiti-di-sistema)
5. [Installazione e Configurazione Locale](#-installazione-e-configurazione-locale)
6. [Configurazione delle Variabili d'Ambiente](#-configurazione-delle-variabili-dambiente)
7. [Script Disponibili](#-script-disponibili)
8. [Deployment ed Hosting](#-deployment-ed-hosting)
9. [Linee Guida per lo Sviluppo (Best Practices)](#-linee-guida-per-lo-sviluppo-best-practices)
10. [Contributi e Licenza](#-contributi-e-licenza)[cite: 1]

---

## Panoramica del Progetto

**NightRec WebApp** rappresenta la prima iterazione web dell'ecosistema NightRec. L'applicazione è strutturata per combinare una gestione fluida degli stati sul client a una solida e scalabile interfaccia frontend, pensata per integrarsi fluidamente con servizi di backend di ultima generazione (come Supabase o API REST custom).[cite: 1]

Grazie all'utilizzo di strumenti di compilazione rapidi e moderni, il progetto riduce a zero i tempi di caricamento in fase di sviluppo (HMR) e produce un bundle di produzione estremamente leggero e ottimizzato.[cite: 1]

---

## Tecnologie e Stack Tecnologico

Il progetto adotta le tecnologie più richieste ed efficienti del panorama web attuale:

* **Core Framework:** [React 18+](https://react.dev/) – Scelto per l'architettura a componenti riutilizzabili e la gestione dichiarativa della UI.[cite: 1]
* **Build Tool & Dev Server:** [Vite](https://vitejs.dev/) – Sostituisce i vecchi setup (es. Create React App) per garantire build istantanee tramite moduli ES nativi.[cite: 1]
* **Stile e Design:** [Tailwind CSS / Custom CSS](https://tailwindcss.com/) – Per una gestione del design atomica, pulita, moderna e altamente personalizzabile.[cite: 1]
* **Codifica e Qualità del Codice:** [ESLint](https://eslint.org/) (v9+) – Configurato con regole rigide per mantenere lo standard del codice JavaScript uniforme ed evitare bug comuni.[cite: 1]
* **Piattaforma di Deployment:** [Vercel](https://vercel.com/) – Integrata nativamente per l'integrazione continua (CI/CD) e la distribuzione globale su CDN.[cite: 1]

---

## Struttura dei File e della Repository

Di seguito l'alberatura principale del progetto con la spiegazione dei file chiave:

```directory
NightRec_webapp/
├── public/                 # Asset pubblici statici distribuiti senza modifiche
│   └── icons/              # Icone dell'applicazione, loghi e favicon
├── src/                    # Codice sorgente dell'applicazione
│   ├── assets/             # Immagini, font o fogli di stile globali
│   ├── components/         # Componenti UI atomici e riutilizzabili
│   ├── context/            # Gestione dello stato globale (React Context)
│   ├── hooks/              # Custom hooks per logica isolata (es. chiamate API, auth)
│   ├── App.jsx             # Componente radice della UI
│   └── main.jsx            # Punto di ingresso JavaScript (inizializza React sul DOM)
├── .env                    # File per le credenziali e variabili d'ambiente (locale)
├── .gitignore              # Elenco di file ed elementi da non tracciare su Git
├── eslint.config.js        # Configurazione del linter ESLint (Flat Config)
├── index.html              # Pagina principale d'ingresso dell'applicazione
├── package.json            # Manifest del progetto (dipendenze, metadati, script)
├── package-lock.json       # Blocco rigoroso delle versioni delle dipendenze npm
├── vercel.json             # File di configurazione per il routing e l'hosting su Vercel
└── vite.config.js          # Configurazione del bundler e dei plugin di Vite
```
[cite: 1]

---

## 💻 Requisiti di Sistema

Prima di procedere con l'installazione, assicurati di avere installato sul tuo computer:
* **Node.js**: Versione **18.x** o superiore (consigliata l'ultima versione LTS).[cite: 1]
* **npm**: Gestore dei pacchetti incluso nativamente con Node.js (versione 9.x o superiore).[cite: 1]

---

## ⚙️ Installazione e Configurazione Locale

Segui questi passaggi dettagliati per configurare l'ambiente di sviluppo in locale:

1.  **Clona il codice della repository:**
```bash
    git clone [https://github.com/DanBgs/NightRec_webapp.git](https://github.com/DanBgs/NightRec_webapp.git)
   ```
[cite: 1]

2.  **Accedi alla cartella del progetto:**
```bash
    cd NightRec_webapp
   ```
[cite: 1]

3.  **Installa tutte le dipendenze richieste:**
```bash
    npm install
   ```
[cite: 1]
    *Questo comando analizzerà il file `package.json` e scaricherà i moduli necessari all'interno della cartella `node_modules/`.*[cite: 1]

---

## Configurazione delle Variabili d'Ambiente

Il progetto include un file `.env` per isolare chiavi API, URL di backend o configurazioni sensibili.[cite: 1]

1.  Crea un file chiamato `.env` nella directory principale del progetto.[cite: 1]
2.  Configura le tue variabili utilizzando il prefisso richiesto da Vite (`VITE_`):[cite: 1]

```env
# Esempio di configurazione (modificare con i valori reali del backend)
VITE_API_URL=[https://api.nightrec.example.com](https://api.nightrec.example.com)
VITE_SUPABASE_URL=[https://your-supabase-project.supabase.co](https://your-supabase-project.supabase.co)
VITE_SUPABASE_ANON_KEY=your-anonymous-key-here
```
[cite: 1]

> **Nota di Sicurezza:** Non caricare **MAI** il file `.env` su GitHub. Assicurati che sia sempre presente all'interno del file `.gitignore`.[cite: 1]

---

## Script Disponibili

All'interno del progetto è possibile lanciare i seguenti comandi via terminale:

* **Avvio in sviluppo:**
```bash
    npm run dev
 ```
[cite: 1]
    Avvia il server locale di Vite con Hot Module Replacement (HMR). L'applicazione sarà solitamente disponibile su `http://localhost:5173`.[cite: 1]

* **Compilazione per la produzione:**
```bash
    npm run build
   ```
[cite: 1]
    Ottimizza, minimizza e compila l'applicazione per la distribuzione finale. Il risultato verrà salvato all'interno di una cartella `/dist`.[cite: 1]

* **Controllo della qualità (Linting):**
```bash
    npm run lint
   ```
[cite: 1]
    Esegue ESLint su tutto il codice sorgente per identificare errori di sintassi, pattern scorretti o violazioni dello stile del codice.[cite: 1]

* **Anteprima della build di produzione:**
```bash
    npm run preview
   ```
[cite: 1]
    Avvia un server locale per testare esattamente come si comporta la build generata dal comando `build`, utile prima di effettuare un deploy manuale.[cite: 1]

---

## Deployment ed Hosting

La repository è già predisposta per un deployment istantaneo su **Vercel** tramite il file di configurazione `vercel.json` incluso.[cite: 1]

### Collegamento Automatico (Consigliato)
1. Connettiti a [Vercel](https://vercel.com).[cite: 1]
2. Importa la repository `DanBgs/NightRec_webapp`.[cite: 1]
3. Vercel riconoscerà automaticamente il setup di **Vite**, configurando autonomamente i comandi di build (`npm run build`) e la cartella di output (`dist`).[cite: 1]
4. Inserisci le tue variabili d'ambiente nella sezione *Environment Variables* del pannello di controllo di Vercel.[cite: 1]
5. Clicca su **Deploy**. Ogni push sul ramo `main` genererà un aggiornamento automatico della demo live.[cite: 1]

**Demo Ufficiale del Progetto:** [https://night-rec-webapp.vercel.app](https://night-rec-webapp.vercel.app)[cite: 1]

---

## 🧠 Linee Guida per lo Sviluppo (Best Practices)

Per mantenere la codebase pulita e coerente, si prega di seguire queste convenzioni:

* **Componenti Atomici:** Dividi l'interfaccia in componenti piccoli e focalizzati su una singola responsabilità all'interno della cartella `src/components`.[cite: 1]
* **Stato Separato:** Utilizza i custom hooks per estrarre la logica di fetching o di calcolo pesante dai componenti visivi.[cite: 1]
* **Uso dei Prefissi ENV:** Ricorda che su Vite solo le variabili d'ambiente che iniziano con `VITE_` vengono esposte nel codice client tramite `import.meta.env.VITE_NOME_VARIABILE`.[cite: 1]
* **Zero Errori di Linting:** Assicurati che `npm run lint` non restituisca alcun errore o avviso prima di effettuare un commit o aprire una Pull Request.[cite: 1]

---

## 🤝 Contributi e Licenza

Se desideri contribuire a NightRec WebApp:
1. Effettua un **Fork** del progetto.[cite: 1]
2. Crea un ramo (branch) dedicato per la tua funzionalità (`git checkout -b feature/NuovaFeature`).[cite: 1]
3. Fai un commit delle tue modifiche seguendo le convenzioni dei messaggi di commit.[cite: 1]
4. Apri una **Pull Request** descrivendo accuratamente le modifiche apportate.[cite: 1]

### 📝 Licenza
Questo progetto è rilasciato sotto licenza [specificare licenza, es. MIT]. Consulta il file dedicato per ulteriori informazioni (se presente).[cite: 1]
