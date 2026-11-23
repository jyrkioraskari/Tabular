import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const instructions = {
  tabularFile: {
    en: {
      title: 'Tabular file',
      steps: [
        'Select a spreadsheet or CSV file from your computer.',
        'The loaded workbook is parsed and sent to connected preview, column description, and RO-Crate nodes.',
        'Optionally convert every data row to RDF using the W3C CSVW model.',
        'Use the export_config sheet to provide RO-Crate metadata such as dataset title, description, and license.',
      ],
    },
    de: {
      title: 'Tabellendatei',
      steps: [
        'Wahle eine Tabellen- oder CSV-Datei von deinem Computer aus.',
        'Die geladene Arbeitsmappe wird analysiert und an verbundene Vorschau-, Spaltenbeschreibungs- und RO-Crate-Knoten weitergegeben.',
        'Konvertiere optional jede Datenzeile nach dem W3C-CSVW-Modell in RDF.',
        'Nutze das Tabellenblatt export_config fur RO-Crate-Metadaten wie Titel, Beschreibung und Lizenz.',
      ],
    },
  },
  previewTabular: {
    en: {
      title: 'Preview tabular data',
      steps: [
        'Connect a Tabular file node to inspect the first rows of the loaded sheet.',
        'Use this node to verify headers and cell values before creating metadata.',
      ],
    },
    de: {
      title: 'Tabellendaten-Vorschau',
      steps: [
        'Verbinde einen Tabellendatei-Knoten, um die ersten Zeilen des geladenen Tabellenblatts zu prufen.',
        'Nutze diesen Knoten, um Kopfzeilen und Zellwerte vor der Metadatenerstellung zu kontrollieren.',
      ],
    },
  },
  columnDescription: {
    en: {
      title: 'Column description',
      steps: [
        'Connect a Tabular file node to populate the table headers.',
        'Write a short description, drag a Terminology Service concept into the description field, or connect Terminology Service to this node and type to search.',
        'Assign units by dragging them from a Units node, or connect Units to this node and type to search. A connected Quantity Kinds node filters the unit suggestions.',
        'Hover over a linked concept or unit name to see its persistent URI.',
        'The node serializes columns with W3C CSVW, Dublin Core descriptions, and QUDT units for connected RO-Crate nodes.',
      ],
    },
    de: {
      title: 'Spaltenbeschreibung',
      steps: [
        'Verbinde einen Tabellendatei-Knoten, um die Kopfzeilen zu laden.',
        'Erganze eine kurze Beschreibung, ziehe einen Begriff des Terminologiedienstes in das Beschreibungsfeld, oder verbinde den Terminologiedienst mit diesem Knoten und tippe, um direkt zu suchen.',
        'Weise Einheiten durch Ziehen aus einem Einheiten-Knoten zu, oder verbinde den Einheiten-Knoten mit diesem Knoten und tippe, um zu suchen. Ein verbundener Groessenarten-Knoten filtert die Einheitenvorschlaege.',
        'Bewege den Mauszeiger uber einen verknupften Begriff oder Einheitennamen, um dessen persistente URI zu sehen.',
        'Der Knoten serialisiert Spalten mit W3C CSVW, Dublin-Core-Beschreibungen und QUDT-Einheiten fur verbundene RO-Crate-Knoten.',
      ],
    },
  },
  quantityKind: {
    en: {
      title: 'Quantity kinds',
      steps: [
        'Search or browse QUDT quantity kinds in the selected language.',
        'Select a quantity kind to filter connected Units nodes.',
      ],
    },
    de: {
      title: 'Groessenarten',
      steps: [
        'Durchsuche QUDT-Groessenarten in der gewahlten Sprache.',
        'Wahle eine Groessenart aus, um verbundene Einheiten-Knoten zu filtern.',
      ],
    },
  },
  unit: {
    en: {
      title: 'Units',
      steps: [
        'Search or browse QUDT units in the selected language.',
        'Connect a Quantity Kinds node to filter this list.',
        'Drag a unit into a Column Description unit field to assign it to a column.',
        'Connect this node to Column Descriptions to search units directly in each unit field while you type.',
      ],
    },
    de: {
      title: 'Einheiten',
      steps: [
        'Durchsuche QUDT-Einheiten in der gewahlten Sprache.',
        'Verbinde einen Groessenarten-Knoten, um die Liste zu filtern.',
        'Ziehe eine Einheit in ein Einheitenfeld der Spaltenbeschreibung.',
        'Verbinde diesen Knoten mit der Spaltenbeschreibung, um direkt in jedem Einheitenfeld beim Tippen zu suchen.',
      ],
    },
  },
  terminology: {
    en: {
      title: 'Terminology Service',
      steps: [
        'Enter a word or phrase to search terminology concepts through the official NFDI4Ing OLS4 API.',
        'Review each result’s label, definition, ontology, and persistent identifier.',
        'Open a concept in a new tab or drag it into a Column Description field; its label is shown while its persistent IRI is retained.',
        'Connect this node to Column Descriptions to search concepts directly in each description field while you type.',
      ],
    },
    de: {
      title: 'Terminologiedienst',
      steps: [
        'Gib ein Wort oder eine Wortgruppe ein, um Begriffe uber die offizielle NFDI4Ing-OLS4-API zu suchen.',
        'Prufe Bezeichnung, Definition, Ontologie und persistenten Identifikator der Ergebnisse.',
        'Offne einen Begriff in einem neuen Tab oder ziehe ihn in ein Spaltenbeschreibungsfeld; die Bezeichnung wird angezeigt und die persistente IRI bleibt erhalten.',
        'Verbinde diesen Knoten mit der Spaltenbeschreibung, um direkt in jedem Beschreibungsfeld beim Tippen zu suchen.',
      ],
    },
  },
  profileSearch: {
    en: {
      title: 'Metadata profile search',
      steps: [
        'Search AIMS for a metadata application profile.',
        'Connect this node to a Metadata Form node.',
        'Select a result to load its SHACL form into the connected Metadata Form.',
      ],
    },
    de: {
      title: 'Metadatenprofil-Suche',
      steps: [
        'Suche in AIMS nach einem Metadaten-Anwendungsprofil.',
        'Verbinde diesen Knoten mit einem Metadatenformular-Knoten.',
        'Wahle ein Ergebnis aus, um das SHACL-Formular in das verbundene Metadatenformular zu laden.',
      ],
    },
  },
  metadataForm: {
    en: {
      title: 'Metadata form',
      steps: [
        'Use the loaded SHACL form to enter dataset metadata.',
        'Forms can come from Metadata Profile Search or from a connected Coscine node.',
        'Valid form entries are emitted as RDF automatically. No separate save step is needed.',
      ],
    },
    de: {
      title: 'Metadatenformular',
      steps: [
        'Trage Datensatz-Metadaten in das geladene SHACL-Formular ein.',
        'Formulare konnen aus der Metadatenprofil-Suche oder aus einem verbundenen Coscine-Knoten kommen.',
        'Gueltige Formulareintraege werden automatisch als RDF ausgegeben. Ein separates Speichern ist nicht noetig.',
      ],
    },
  },
  rdfStore: {
    en: {
      title: 'RDF Store',
      steps: [
        'Connect metadata-producing nodes to collect their Turtle RDF.',
        'Review the loaded triples and preview the Turtle content.',
        'Download metadata.ttl when you need the combined RDF file.',
      ],
    },
    de: {
      title: 'RDF Store',
      steps: [
        'Verbinde Metadaten-Knoten, um deren Turtle-RDF zu sammeln.',
        'Prufe die geladenen Tripel und die Turtle-Vorschau.',
        'Lade metadata.ttl herunter, wenn du die kombinierte RDF-Datei brauchst.',
      ],
    },
  },
  roCrate: {
    en: {
      title: 'RO-Crate',
      steps: [
        'Connect RDF-producing and tabular nodes directly to collect their outputs.',
        'Review the RDF triples, preview the Turtle, or download metadata.ttl.',
        'Choose a dataset licence, or Unspecified if you cannot make a licence claim.',
        'Download the RO-Crate ZIP locally or connect this node to Coscine for upload.',
      ],
    },
    de: {
      title: 'RO-Crate',
      steps: [
        'Verbinde RDF-erzeugende und Tabellendaten-Knoten direkt, um deren Ausgaben zu sammeln.',
        'Prufe die RDF-Tripel und die Turtle-Vorschau oder lade metadata.ttl herunter.',
        'Lade das RO-Crate-ZIP lokal herunter oder verbinde diesen Knoten mit Coscine fur den Upload.',
        'Wahle eine Datensatzlizenz oder Unspecified, wenn du keine Lizenz angeben kannst.',
      ],
    },
  },
  pythonScript: {
    en: {
      title: 'Python script',
      steps: [
        'Write a run(inputs, data) function in Python; inputs holds one entry per connected upstream node, keyed by its label.',
        'Return any JSON-serializable value; it becomes the node output and can be downloaded as JSON.',
        'The code runs as a Python 3 subprocess of the local application server (desktop app or "npm run serve"), with a timeout and size limits.',
        'Python must be installed on this machine; otherwise the node reports that Python 3 was not found.',
        'Code from an imported workflow file is never run automatically; choose "Trust and run this code" to enable it.',
        'Save a configured node to My nodes to reuse it as your own node type.',
      ],
    },
    de: {
      title: 'Python-Skript',
      steps: [
        'Schreibe eine Funktion run(inputs, data) in Python; inputs enthaelt einen Eintrag pro verbundenem Upstream-Knoten, adressiert ueber dessen Bezeichnung.',
        'Gib einen JSON-serialisierbaren Wert zurueck; er wird zur Knotenausgabe und kann als JSON heruntergeladen werden.',
        'Der Code laeuft als Python-3-Subprozess des lokalen Anwendungs servers (Desktop-App oder "npm run serve"), mit Zeit- und Groessenlimits.',
        'Python muss auf diesem Geraet installiert sein; sonst meldet der Knoten, dass Python 3 nicht gefunden wurde.',
        'Code aus einer importierten Workflow-Datei wird nie automatisch ausgefuehrt; wahle "Code vertrauen und ausfuehren", um ihn zu aktivieren.',
        'Speichere einen konfigurierten Knoten in Meine Knoten, um ihn als eigenen Knotentyp wiederzuverwenden.',
      ],
    },
  },
  n8nCommunity: {
    en: {
      title: 'n8n community node',
      steps: [
        'Install the community package in your own n8n instance and place its node between a Webhook trigger and a Respond to Webhook node.',
        'Copy the webhook URL into this Tabular node. Give it the community node name and package so the canvas identifies it.',
        'Connect Tabular inputs, inspect Data to send, then choose Run. The connected data is sent to your n8n instance.',
        'Inspect or download the response here. You can also connect it to another n8n community node or a Python script.',
        'Workflow exports omit the webhook URL, authentication value, and previous response.',
      ],
    },
    de: {
      title: 'n8n-Community-Knoten',
      steps: [
        'Installiere das Community-Paket in deiner n8n-Instanz und verbinde dessen Knoten mit einem Webhook-Ausloeser und einem Respond to Webhook-Knoten.',
        'Kopiere die Webhook-URL in diesen Tabular-Knoten. Gib Knotenname und Paket an, damit der Knoten im Canvas erkennbar ist.',
        'Verbinde Tabular-Eingaben, pruefe Daten zum Senden und waehle Ausfuehren. Die verbundenen Daten werden an deine n8n-Instanz gesendet.',
        'Pruefe oder lade die Antwort herunter. Du kannst sie mit einem weiteren n8n-Community-Knoten oder Python-Skript verbinden.',
        'Workflow-Exporte enthalten weder Webhook-URL noch Authentifizierungswert oder letzte Antwort.',
      ],
    },
  },
  coscine: {
    en: {
      title: 'Coscine',
      steps: [
        'Enter a Coscine API token and load your accessible resources.',
        'Select Remember token in this browser only on a trusted device; clearing it removes the stored token.',
        'Select a resource to load its associated SHACL form.',
        'Connecting an RO-Crate automatically connects Coscine to the associated Metadata Form.',
        'Upload the generated ZIP resource to the selected Coscine resource.',
      ],
    },
    de: {
      title: 'Coscine',
      steps: [
        'Gib ein Coscine-API-Token ein und lade deine erreichbaren Ressourcen.',
        'Wahle Token in diesem Browser speichern nur auf einem vertrauenswurdigen Gerat; das Abwahlen entfernt das gespeicherte Token.',
        'Wahle eine Ressource aus, um das zugehorige SHACL-Formular zu laden.',
        'Das Verbinden eines RO-Crate-Knotens verbindet Coscine automatisch mit dem zugehorigen Metadatenformular.',
        'Lade die erzeugte ZIP-Ressource in die gewahlte Coscine-Ressource hoch.',
      ],
    },
  },
};

const fallbackCopy = {
  en: {
    title: 'Node help',
    close: 'Close',
  },
  de: {
    title: 'Knotenhilfe',
    close: 'Schliessen',
  },
};

export default function NodeInfoButton({ nodeType, language = 'en' }) {
  const [isOpen, setIsOpen] = useState(false);
  const copy = fallbackCopy[language] ?? fallbackCopy.en;
  const content = useMemo(() => {
    const nodeInstructions = instructions[nodeType] ?? {};
    return nodeInstructions[language] ?? nodeInstructions.en ?? {
      title: copy.title,
      steps: [],
    };
  }, [copy.title, language, nodeType]);

  return (
    <>
      <button
        type="button"
        className="node-info-button nodrag"
        aria-label={content.title}
        title={content.title}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(true);
        }}
      >
        i
      </button>
      {isOpen ? createPortal(
        <div
          className="node-info-modal nodrag nopan"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`node-info-title-${nodeType}`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div
            className="node-info-modal__backdrop"
            onClick={() => setIsOpen(false)}
          />
          <div className="node-info-modal__panel">
            <h2 id={`node-info-title-${nodeType}`}>{content.title}</h2>
            <ol>
              {content.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button
              type="button"
              className="node-info-modal__close"
              onClick={() => setIsOpen(false)}
            >
              {copy.close}
            </button>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
