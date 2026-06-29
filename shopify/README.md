# Konfigurator 3D stołów epoksydowych — Shopify

Interaktywny konfigurator 3D do sklepu Shopify (lub jako samodzielna strona). Klient może ustawić wymiary, drewno, kolor żywicy, styl wypełnienia, krawędź i nogi, zobaczyć podgląd 3D w czasie rzeczywistym i sprawdzić cenę.

**Produkt Shopify nie jest wymagany.** Konfigurator działa niezależnie — produkt potrzebny jest tylko wtedy, gdy chcesz „Dodaj do koszyka”.

## Podgląd lokalny (bez Shopify)

Najszybszy sposób, żeby zobaczyć wygląd:

```bash
cd shopify
python3 -m http.server 8080
```

Otwórz w przeglądarce: **http://localhost:8080/demo.html**

Możesz też otworzyć plik `demo.html` bezpośrednio — ale serwer HTTP jest pewniejszy (moduły ES / importmap).

## Dlaczego w ogóle był produkt?

Shopify **wymaga produktu tylko do koszyka i płatności** — to ograniczenie platformy, nie konfiguratora. Sam podgląd 3D, wycena i UI działają bez niego.

Tryby przycisku (bez produktu):

| Akcja | Co robi |
|-------|---------|
| **Kopiuj konfigurację** (domyślna) | Kopiuje specyfikację + cenę do schowka |
| **Wyślij e-mail** | Otwiera klienta poczty z gotową wiadomością |
| **Przekieruj na URL** | Przechodzi na stronę kontaktu/zamówienia z parametrami |
| **Ukryj przycisk** | Tylko podgląd 3D i cena |
| **Dodaj do koszyka** | Wymaga podłączenia produktu Shopify |

## Funkcje

- **Podgląd 3D** (Three.js) — obracanie i przybliżanie myszką
- **Konfiguracja:**
  - Wymiary blatu (długość, szerokość, grubość)
  - Rodzaj drewna (dąb, orzech, jesion, oliwka)
  - Styl żywicy (rzeka, pas akcentowy, pełne wypełnienie)
  - Kolor żywicy (przezroczysta, ocean, szmaragd, bursztyn, czarna)
  - Krawędź (live edge / prosta)
  - Nogi (hairpin, drewniane, rama U, rama X) + kolor
- **Dynamiczna wycena** na podstawie powierzchni, objętości żywicy i wybranych opcji
- **Dodawanie do koszyka** przez Shopify Ajax Cart API (`/cart/add.js`)
- **Właściwości pozycji** (line item properties) — pełna specyfikacja w zamówieniu

## Instalacja w Shopify

### 1. Wgraj pliki do motywu

Wgraj pliki do motywu:

| Plik lokalny | Folder w motywie |
|---|---|
| `sections/epoxy-table-configurator.liquid` | `sections/` |
| `assets/epoxy-configurator.js` | `assets/` |
| `assets/epoxy-textures.js` | `assets/` |
| `assets/epoxy-configurator.css` | `assets/` |
| `assets/textures/*.jpg` | `assets/textures/` |

Tekstury drewna (CC0, [Poly Haven](https://polyhaven.com)): mapy koloru, normalnej i chropowatości dla dębu, orzecha, jesionu i oliwki.

### 2. Utwórz produkty (tylko dla koszyka)

Pomiń ten krok, jeśli używasz trybu bez produktu (e-mail / kopiuj / link).

**Produkt bazowy** — np. „Stół epoksydowy — konfigurator”:
- Ustaw cenę bazową (np. 2500 PLN) — to cena startowa w kalkulatorze
- Jeden wariant wystarczy

**Produkt dopłaty** (opcjonalnie, zalecane):
- Utwórz ukryty produkt „Dopłata konfigurator” z ceną **1,00 PLN** za sztukę
- Oznacz go jako ukryty w katalogu (nie pokazuj w sklepie)
- Konfigurator automatycznie doda go do koszyka z ilością = różnica ceny w PLN
- Dzięki temu suma w koszyku = dokładna wycena z konfiguratora

### 3. Dodaj sekcję do strony

1. **Dostosuj motyw** → dodaj sekcję **„Konfigurator stołu epoksydowego”**
2. Ustaw **akcję przycisku** (domyślnie: kopiuj konfigurację — bez produktu)
3. Opcjonalnie wybierz **produkt bazowy**, jeśli chcesz koszyk
4. Dostosuj stawki wyceny w ustawieniach sekcji

### 4. Opublikuj

Zapisz i opublikuj motyw. Konfigurator jest gotowy.

## Dostosowanie cen

Dopłaty za opcje są w pliku `sections/epoxy-table-configurator.liquid` w atrybutach `data-price-addon` (wartości w **groszach**):

```html
<input type="radio" name="wood" value="walnut" data-price-addon="80000">
<!-- 80000 groszy = 800 PLN dopłaty za orzech -->
```

Możesz też edytować wzór wyceny w `assets/epoxy-configurator.js` w metodzie `calculatePrice()`.

## Integracja z koszykiem

Po kliknięciu „Dodaj do koszyka” konfigurator:

1. Wysyła żądanie `POST /cart/add.js` z konfiguracją jako `properties`
2. Opcjonalnie dodaje produkt dopłaty z odpowiednią ilością
3. Emituje zdarzenie `cart:refresh` (kompatybilne z Dawn i większością motywów 2.0)
4. Próbuje otworzyć drawer koszyka, jeśli motyw go obsługuje

### Przykład properties w zamówieniu

```
Długość: 200 cm
Szerokość: 90 cm
Grubość blatu: 4 cm
Drewno: Orzech
Styl żywicy: Rzeka (środek)
Kolor żywicy: Ocean
Krawędź: Naturalna (live edge)
Nogi: Hairpin (metal)
Kolor nóg: Czarny
_Wycena konfiguratora: 6 847,00 zł
```

## Wymagania

- Motyw Shopify 2.0 (Online Store 2.0)
- Przeglądarka z obsługą WebGL i ES Modules (importmap)
- Połączenie internetowe (Three.js ładowany z CDN jsDelivr)

## Struktura plików

```
shopify/
├── README.md
├── demo.html                             # Podgląd lokalny bez Shopify
├── sections/
│   └── epoxy-table-configurator.liquid
└── assets/
    ├── epoxy-configurator.js
    └── epoxy-configurator.css
```

## Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---|---|
| Brak podglądu 3D | Sprawdź konsolę przeglądarki; upewnij się, że CDN Three.js nie jest blokowany |
| Przycisk „Dodaj do koszyka” nieaktywny | Wybierz produkt bazowy w ustawieniach sekcji |
| Cena w koszyku ≠ cena konfiguratora | Skonfiguruj produkt dopłaty (1 PLN/szt.) |
| Drawer koszyka się nie otwiera | Normalne dla niektórych motywów — produkt i tak trafia do koszyka |

## Dalszy rozwój

- Tekstury drewna (mapy UV z prawdziwymi zdjęciami desk)
- Eksport PDF ze specyfikacją
- Integracja z Shopify Functions do automatycznej korekty ceny
- Własne modele 3D (GLB/GLTF) zamiast geometrii proceduralnej
