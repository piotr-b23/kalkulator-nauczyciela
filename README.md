# Kalkulator Nauczyciela

Strona dla nauczycieli, która przelicza punkty ucznia ze sprawdzianu, kartkówki lub innej aktywności na **procent** i **ocenę w polskiej skali 1–6**, z plusami i minusami.

Wystarczy wpisać, ile punktów można było zdobyć i ile zdobył uczeń. Wynik procentowy i ocena pojawiają się od razu.

## Funkcje

- **Punkty → procent → ocena** liczone na bieżąco, bez przycisku „Oblicz”.
- **Oceny z plusem i minusem** – do włączenia lub wyłączenia; każdy tryb ma osobne progi.
- **Własne progi procentowe** w zakresie „od – do” dla każdej oceny.
- **Gotowe zestawy progów**: Standardowy (30/50/70/90/98), Łagodny i Wymagający.
- **Przedziały punktowe** dla każdej oceny przy danym sprawdzianie – pomocne przy tworzeniu klucza.
- **Informacja, ile punktów brakuje** do następnej oceny.
- **Zaokrąglanie procentu**: bez zaokrąglania, do pełnych, w dół lub w górę.
- **Punkty połówkowe**: przyznawane co 1, 0,5 lub 0,25 punktu.
- **Kod ustawień** – progi można skopiować jako krótki kod i wczytać na innym urządzeniu lub dopisać do adresu strony po znaku `#`.
- **Tryb jasny i ciemny.**
- **Wygodna obsługa na telefonie.**

## Szybkie wpisywanie wyników

- **Enter** w polu „Punkty ucznia” zaznacza je, więc od razu można wpisać wynik kolejnej osoby.
- **Strzałki ↑/↓** oraz przyciski **−/+** zmieniają punkty o jeden krok.

## Ważne

Domyślne progi są przykładowe. Zasady oceniania określa statut szkoły, dlatego przed użyciem warto ustawić progi zgodne z obowiązującymi w danej szkole. Kalkulator jest narzędziem pomocniczym – ocenę zawsze ustala nauczyciel.

## Prywatność

- Strona nie zbiera danych osobowych i nie używa plików cookies.
- Ustawienia zapisują się wyłącznie w pamięci przeglądarki na urządzeniu użytkownika.
- Czcionki są dołączone do projektu, więc strona nie łączy się z zewnętrznymi serwisami.
- Hosting zapewnia GitHub Pages, który zapisuje adresy IP odwiedzających ze względów bezpieczeństwa.

## Technologia

Czysty HTML, CSS i JavaScript – bez bibliotek, frameworków i procesu budowania.

```
├── index.html      – treść strony
├── css/
│   ├── fonts.css   – deklaracje czcionek
│   └── style.css   – wygląd strony
├── js/
│   └── app.js      – logika kalkulatora
└── fonts/          – pliki czcionek i ich licencje
```

Aby uruchomić stronę lokalnie, wystarczy otworzyć `index.html` w przeglądarce albo uruchomić prosty serwer w folderze projektu:

```bash
python -m http.server 8000
```

## Czcionki

Projekt używa czcionek na licencji [SIL Open Font License 1.1](https://openfontlicense.org):

- **Caveat** – © 2014 The Caveat Project Authors
- **IBM Plex Mono** – © 2017 IBM Corp.
- **Schibsted Grotesk** – © 2023 The Schibsted-Grotesk Project Authors

Pełne teksty licencji znajdują się w folderze `fonts/`.
