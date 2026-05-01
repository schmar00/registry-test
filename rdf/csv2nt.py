import csv
import sys
from pathlib import Path
from collections import defaultdict

BASE = "https://registry.inspire.gv.at/codelist/"
STATUS_BASE = "https://inspire.ec.europa.eu/registry/status/"

# Map column names to predicate URIs
PREDICATE_MAP = {
    "Label":            "http://www.w3.org/2004/02/skos/core#prefLabel",
    "Definition":       "http://www.w3.org/2004/02/skos/core#definition",
    "Description":      "http://purl.org/dc/terms/description",
    "Status":           "http://www.w3.org/ns/adms#status",
    "Comment":          "http://www.w3.org/2000/01/rdf-schema#comment",
    "Extensibility":    "http://inspire.ec.europa.eu/registry/reg/extensibility",
    "InternalExternal": "http://inspire.ec.europa.eu/registry/reg/internalExternal",
    "ApplicationSchema":"http://purl.org/dc/terms/isPartOf",
    "Theme":            "http://inspire.ec.europa.eu/registry/reg/theme",
    "GovernanceLevel":  "http://inspire.ec.europa.eu/registry/reg/governanceLevel",
    "ReferenceLink":    "http://www.w3.org/2000/01/rdf-schema#seeAlso",
    "ReferenceSource":  "http://purl.org/dc/terms/source",
    "ParentLocalId":    "http://www.w3.org/2004/02/skos/core#broader",
    "CollectionLocalId":"http://www.w3.org/2004/02/skos/core#inScheme",
}

# Columns whose values receive a language tag
LANG_COLUMNS = {"Label", "Definition", "Description"}

# Columns whose values are already URIs
URI_COLUMNS = {"ApplicationSchema", "Theme"}

# Columns handled via special logic (not generic literal output)
SKIP_COLUMNS = {"LocalId", "Language"}


def escape_literal(value):
    return (value
            .replace("\\", "\\\\")
            .replace('"', '\\"')
            .replace("\n", "\\n")
            .replace("\r", "\\r"))


def nt_uri(uri):
    return f"<{uri}>"


def nt_literal(value, lang=None):
    escaped = escape_literal(value)
    if lang:
        return f'"{escaped}"@{lang}'
    return f'"{escaped}"'


def subject_uri(local_id, collection_local_id):
    if collection_local_id:
        return f"{BASE}{collection_local_id}/{local_id}"
    return f"{BASE}{local_id}"


def main():
    input_path = Path(__file__).parent / "codelists.csv"
    output_path = Path(__file__).parent / "codelists.nt"

    if len(sys.argv) > 1:
        input_path = Path(sys.argv[1])
    if len(sys.argv) > 2:
        output_path = Path(sys.argv[2])

    # Group rows by (LocalId, CollectionLocalId) to merge multi-language rows
    groups = defaultdict(list)

    with open(input_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            key = (row["LocalId"].strip(), row["CollectionLocalId"].strip())
            groups[key].append(row)

    triples = []

    for (local_id, collection_local_id), rows in groups.items():
        subj = subject_uri(local_id, collection_local_id)

        # rdf:type skos:Concept
        triples.append((subj, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        nt_uri("http://www.w3.org/2004/02/skos/core#Concept")))

        # skos:notation = LocalId as plain literal
        triples.append((subj, "http://www.w3.org/2004/02/skos/core#notation",
                        nt_literal(local_id)))

        emitted_non_lang = set()  # track non-language columns already written

        for row in rows:
            lang = row.get("Language", "").strip()

            for col, predicate in PREDICATE_MAP.items():
                if col in SKIP_COLUMNS:
                    continue

                value = (row.get(col) or "").strip()
                if not value:
                    continue

                if col in LANG_COLUMNS:
                    obj = nt_literal(value, lang if lang else None)
                    triples.append((subj, predicate, obj))

                elif col == "Status":
                    if col not in emitted_non_lang:
                        obj = nt_uri(f"{STATUS_BASE}{value}")
                        triples.append((subj, predicate, obj))
                        emitted_non_lang.add(col)

                elif col == "ParentLocalId":
                    if col not in emitted_non_lang:
                        parent_uri = subject_uri(value, collection_local_id)
                        triples.append((subj, predicate, nt_uri(parent_uri)))
                        emitted_non_lang.add(col)

                elif col == "CollectionLocalId":
                    if col not in emitted_non_lang:
                        obj = nt_uri(f"{BASE}{value}")
                        triples.append((subj, predicate, obj))
                        emitted_non_lang.add(col)

                elif col in URI_COLUMNS:
                    if col not in emitted_non_lang:
                        triples.append((subj, predicate, nt_uri(value)))
                        emitted_non_lang.add(col)

                else:
                    if col not in emitted_non_lang:
                        triples.append((subj, predicate, nt_literal(value)))
                        emitted_non_lang.add(col)

    with open(output_path, "w", encoding="utf-8") as out:
        for subj, pred, obj in triples:
            out.write(f"{nt_uri(subj)} {nt_uri(pred)} {obj} .\n")

    print(f"Written {len(triples)} triples to {output_path}")


if __name__ == "__main__":
    main()
