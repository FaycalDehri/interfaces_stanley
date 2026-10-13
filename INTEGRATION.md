# Envoyer des données aux écrans

Le serveur de synchronisation (port 8787) reçoit des données en **JSON ou en CSV** et les diffuse à tous les écrans. Le format définitif est fixé par l'équipe qui développe la plateforme ; ce document décrit ce que les écrans savent lire aujourd'hui. Tant qu'un bloc n'a rien reçu, les écrans affichent le jeu d'essai avec le badge SIMULÉ.

En CSV, la première ligne donne les noms des colonnes ; séparateur virgule ou point-virgule.

## Événements : `POST /api/events`

Un événement ou une liste, en JSON ; ou plusieurs lignes en CSV (colonne `type` obligatoire). `at` est facultatif (heure de réception par défaut).

| type | champs | utilisé en |
|---|---|---|
| `solve` | `team`, `challenge`, `points`? | CTF |
| `attack` | `team` (qui défend), `target` (nœud), `technique`? | équipe contre équipe |
| `detect` | `id` de l'attaque, ou `team` + `target` | équipe contre équipe |
| `step` | `team`, `step` (index dans la chaîne, 0 = première étape) | contre l'IA |
| `alert` | `title`, `severity` (faible, moyenne, haute, critique), `target`?, `technique`?, `public`? | tous |
| `node` | `id`, `status` (sain, attaque, compromis, hors-ligne) | tous |
| `phase` | `phase` (avant, echauffement, jeu, derniere-heure, termine) | tous |

```
curl -X POST http://IP:8787/api/events -H "Content-Type: application/json" \
  -d '{"type":"solve","team":"t1","challenge":"c4"}'

curl -X POST http://IP:8787/api/events -H "Content-Type: text/csv" --data-binary @evenements.csv
```
```
type,team,challenge,target,title,severity,public
solve,t1,c4,,,,
alert,,,web01,Brute force SSH sur WEB-01,haute,true
```

Les alertes sont **privées par défaut** (`public` absent = non affichée sur la tour) : c'est l'administrateur qui décide de ce qui est montré.

## Référentiels : `PUT`

| route | contenu | formats |
|---|---|---|
| `/api/teams` | `id`, `name`, `members` | JSON ou CSV |
| `/api/challenges` | `id`, `name`, `tactic` (TAxxxx), `points`, `status` (ouvert, verrouille) | JSON ou CSV |
| `/api/chain` | étapes de la chaîne d'attaque : `tactic`, `label` | JSON ou CSV |
| `/api/topology` | `{ "nodes": [{id, label, x?, y?, status}], "links": [{from, to}] }` | JSON |
| `/api/exercise` | `name`, `scenario`, `durationSec`, `access` (`url`, `network`, `support`, `flagFormat`), `rules` | JSON |

## Pilotage : `POST /api/control`

`{"proposition":"A|B|C"}`, `{"mode":"ctf|ad-pvp|ad-ia"}`, `{"phase":"…"}`, `{"reset":true}`. C'est ce qu'utilise la page `/demo`, et ce qu'utilisera le pavé tactile.

## Lecture

`GET /state` (état complet), `GET /events` (flux SSE), `GET /health`.

## Sécurité

Lancer avec `INGEST_TOKEN=secret` pour exiger `Authorization: Bearer secret` sur toutes les écritures. Sans jeton, n'importe qui sur le réseau peut modifier les scores.

## Barèmes

Les scores affichés sont calculés par les écrans (`src/lib/scoring.ts`) avec les barèmes proposés dans le cahier des charges (§5.1), en attente de validation par le groupe 7.
