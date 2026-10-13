# Stanley · écrans de la tour (groupe 8)

Application qui affiche les 8 positions d'écran d'une face de la tour hexagonale, et serveur de synchronisation qui alimente ces écrans. Tout tourne depuis un seul ordinateur ; chaque Raspberry Pi n'a qu'à ouvrir une page web.

Documents liés : le cahier des charges (propositions A, B, C, vues, barèmes) et `INTEGRATION.md` (formats JSON et CSV pour envoyer des données aux écrans).

## 1. Prérequis

- **Node.js 22 LTS** (minimum 20.19). Vérifier avec `node -v`. Si la version est plus ancienne, installer la LTS depuis nodejs.org.
- Une connexion Internet **une seule fois**, pour `npm install`. Ensuite tout fonctionne hors ligne : les polices sont embarquées.

## 2. Lancer la démo sur son ordinateur

Dans un terminal (PowerShell sous Windows), **dans le dossier qui contient `package.json`** :

```
npm install
npm run tour:build
npm run tour
```

- `npm install` : télécharge les dépendances (une fois).
- `npm run tour:build` : construit l'application (à refaire après toute modification du code).
- `npm run tour` : lance les écrans sur le port 3000 et le serveur de synchronisation sur le port 8787, avec des données simulées. Le terminal affiche l'adresse réseau de l'ordinateur et l'URL de chaque Pi. Ctrl+C pour arrêter.

Puis ouvrir dans un navigateur :

| Adresse | Contenu |
|---|---|
| http://localhost:3000/demo | pilotage : proposition A, B ou C, mode, phase, envoi d'événements, avec l'aperçu d'une face |
| http://localhost:3000/face | une face complète (8 positions), `?prop=A` pour forcer une proposition |
| http://localhost:3000/pos/1 … /pos/8 | ce qu'affiche chaque Pi |
| http://localhost:3000/vue/classement-large | une vue seule, en entier (liste sur la page d'accueil) |

Pour simuler la tour sans Pi : ouvrir 8 fenêtres de navigateur en plein écran (F11) sur `/pos/1` à `/pos/8`.

Options :
- `npm run tour -- --no-sim` : sans événements simulés (les données du jeu d'essai restent affichées, avec le badge SIMULÉ).
- Pendant le développement : `npm run dev` (port 5173, rechargement automatique) et, dans un second terminal, `npm run sync`.

## 3. Sur la tour, avec les Raspberry Pi

### Côté ordinateur

1. **Brancher l'ordinateur sur le même réseau que les Pi.** D'après le groupe 3, les Pi sont sur le VLAN 70 (10.10.70.0/24, ports 26 à 29 du switch CRS354). Le plus simple est de se brancher sur un de ces ports. S'il n'y a pas de DHCP, donner à l'ordinateur une adresse fixe libre de ce réseau (à confirmer avec le groupe 3).
2. `npm run tour` puis noter l'adresse affichée (ci-dessous : `IP_DU_PC`).
3. **Windows** : accepter la demande du pare-feu pour Node.js, réseau privé. Sinon les Pi ne pourront pas se connecter.

### Côté Raspberry Pi (une fois par Pi)

Raspberry Pi OS avec bureau (version 64 bits). Le Pi n° N est celui de la position N :

| Pi | Position sur la face |
|---|---|
| 1, 2 | rangée 1 (haut), gauche puis droite |
| 3, 4 | rangée 2 |
| 5, 6 | rangée 3 |
| 7, 8 | rangée 4 (bas) |

1. Vérifier que le Pi joint l'ordinateur : `ping IP_DU_PC`.
2. Ouvrir `http://IP_DU_PC:3000/pos/N` dans le navigateur pour vérifier.
3. Passer en plein écran :
   ```
   chromium-browser --kiosk --noerrdialogs --disable-infobars --incognito http://IP_DU_PC:3000/pos/N
   ```
   Sur les versions récentes de Raspberry Pi OS la commande s'appelle `chromium`. Alt+F4 pour sortir.
4. Pour que ça se lance tout seul au démarrage : `sudo raspi-config` › System Options › Boot / Auto Login › Desktop Autologin, puis créer le fichier `~/.config/labwc/autostart` (ou la section `[autostart]` de `~/.config/wayfire.ini` sur les versions plus anciennes) avec la ligne :
   ```
   chromium-browser --kiosk --noerrdialogs --disable-infobars --incognito http://IP_DU_PC:3000/pos/N &
   ```
5. Désactiver la mise en veille de l'écran : `sudo raspi-config` › Display Options › Screen Blanking › No.

En propositions B et C, les Pi 5 et 6, puis 7 et 8, affichent chacun la moitié d'une même vue. Un Pi branché à la mauvaise position se voit immédiatement.

### Piloter pendant la démo

Ouvrir `http://IP_DU_PC:3000/demo` sur l'ordinateur. Tout changement (proposition, mode, phase, événement) s'applique à tous les écrans en même temps, sans recharger les pages.

## 4. Si ça ne marche pas

| Symptôme | Cause probable | Que faire |
|---|---|---|
| `npm ERR! enoent … package.json` | le terminal n'est pas dans le bon dossier | `cd` dans le dossier qui contient `package.json` |
| erreur à `npm install` ou `npm run tour:build` | Node.js trop ancien | `node -v` doit afficher 20.19 ou plus |
| « Le port 3000 est déjà utilisé » | une instance tourne encore | la fermer (Ctrl+C dans son terminal) |
| la page ne s'ouvre pas sur le Pi | pas sur le même réseau | `ping IP_DU_PC` depuis le Pi ; vérifier le port du switch |
| badge « HORS LIGNE · SIMULÉ » sur le Pi | la page est chargée (port 3000) mais pas le serveur de synchro (port 8787) | pare-feu de l'ordinateur ; en dernier recours ajouter `?sync=http://IP_DU_PC:8787` à l'URL |
| l'écran du Pi s'éteint | mise en veille | raspi-config › Screen Blanking › No |
| masquer le badge RÉEL / SIMULÉ | | ajouter `?badge=0` à l'URL (pour une démo, mieux vaut le laisser : il dit honnêtement d'où viennent les données) |

## 5. Envoyer de vraies données

Voir `INTEGRATION.md`. En résumé : `POST http://IP_DU_PC:8787/api/events` en JSON ou en CSV. Dès qu'un bloc reçoit des données réelles, son badge passe de SIMULÉ à RÉEL.

## 6. Organisation du code

```
src/lib/contract.ts      forme des données (modes, phases, tactiques ATT&CK, blocs)
src/lib/layouts.ts       les trois propositions, position par position
src/lib/views.tsx        les vues, dessinées en 1920×1080 (3840×1080 pour une vue large)
src/lib/frame.tsx        mise à l'échelle, demi-vues sur deux Pi, badge RÉEL / SIMULÉ
src/lib/scoring.ts       barèmes (propositions du cahier §5.1, à valider avec le groupe 7)
src/lib/store.ts         connexion au serveur de synchro, repli hors ligne
src/data/seed.json       jeu d'essai simulé
sync-server/server.mjs   serveur de synchronisation (Node, sans dépendance)
scripts/tour.mjs         lanceur : construction, puis écrans + synchro
src/routes/              pages : /pos/N, /face, /vue/<id>, /demo
```

Pour ajouter une vue : la dessiner dans `views.tsx`, l'enregistrer dans `VIEWS`, la déclarer dans `layouts.ts` (`VIEW_DATA`, `VIEW_TITLE`), puis la placer dans une proposition.

## 7. Ce qui a été testé, et ce qui ne l'a pas été

Testé : installation depuis zéro, construction, 8 navigateurs en 1920×1080 connectés en même temps par l'adresse réseau de l'ordinateur, changement de proposition, de mode et de phase en direct, envoi d'événements en JSON et en CSV.

Pas testé : un vrai Raspberry Pi 4 (performances), la tour, les splitters HDMI, le réseau de la salle.

Ce code reprend la charte graphique du prototype initial du groupe. Les écrans « régie » de ce prototype ont été retirés : ils n'affichaient que des données fictives et deviennent les maquettes du pavé tactile (cahier des charges, §8).
