# Posiłki — prywatny dziennik PWA

Prototyp aplikacji React + TypeScript dla iPhone'a oraz komputera. **Działa lokalnie bez konta i kluczy.** Supabase jest opcjonalny do synchronizacji, a OpenAI do interpretacji zdjęć, naturalnego języka i nagrań.

## Co działa w prototypie

- Dziennik posiłków z datą i rzeczywistą godziną oraz edycją po zapisaniu.
- Kalorie, białko, węglowodany, tłuszcz, opcjonalnie błonnik; podsumowanie dzienne.
- Lokalny parser polskich opisów z podanymi kcal i makro — nie wymaga AI.
- Analiza opisów i zdjęć przez OpenAI (po skonfigurowaniu i zalogowaniu).
- Dyktowanie przez mikrofon i transkrypcja OpenAI (po skonfigurowaniu).
- Własne składniki posiłku; przeliczenie sumy **wyłącznie na żądanie**.
- Wykres kalorii z ostatnich 14 dni oraz wykres masy ciała, glukozy i ciśnienia.
- Ręczny import `export.zip` / `export.xml` z Apple Zdrowie. Plik przetwarzany lokalnie.
- Wykres glukozy od 30 min przed posiłkiem do 180 min po posiłku (jeśli są dane).
- Local-first w IndexedDB, demonstracyjne dane do sprawdzenia UI.
- Opcjonalne logowanie przez Supabase i synchronizacja posiłków między urządzeniami.
- Pomiary zdrowotne pozostają lokalne, **dopóki nie zaznaczysz zgody na ich synchronizację**.
- Eksport dziennika CSV i kopii JSON.

### Co jeszcze NIE jest gotowe

- Nie ma bezpośredniego HealthKit: Apple Zdrowie jest importowane z eksportu ZIP/XML.
- Nie ma automatycznego wyliczania makr z zewnętrznej, zweryfikowanej bazy produktów. Jeśli AI rozpoznaje sałatkę bez etykiety, podaje **orientacyjny szacunek**, nie laboratoryjnie poprawną wartość.
- Nie ma pełnego offline queue z automatycznym rozwiązaniem konfliktów. Synchronizacja jest uproszczona: ostatni czas `updatedAt` wygrywa. Do użytku produkcyjnego trzeba rozbudować obsługę konfliktów i migracji danych.
- Nie ma samoczynnej interpretacji medycznej ani diagnoz. Wykresy pokazują zbieżność w czasie, a nie przyczynowość.
- Bardzo duże eksporty Apple Zdrowie mogą przekroczyć pamięć iPhone'a; ZIP z XML ponad 300 MB jest blokowany. Na Macu można rozpakować archiwum i wczytać sam XML. Import obejmuje maks. 100 000 pomiarów w jednym pliku.
- Kopię JSON można pobrać, ale w tej wersji nie ma jeszcze przycisku przywracania kopii.
- Zdjęcia nie są przechowywane w dzienniku. Wysyłasz je do OpenAI tylko po kliknięciu „Rozpoznaj AI”.

## 1. Lokalny start — bez Supabase i OpenAI

Wymagany Node.js 20+ (zalecany 22).

```bash
npm install
npm run dev
```

Otwórz `http://localhost:5173`. Dodawaj ręczne wpisy; w polu opisu wpisz np.:

```text
Kurczak curry, 625 kcal, B: 38 g, W: 68 g, T: 22 g, o 13:40
```

Naciśnij **„Odczytaj liczby lokalnie”**. Parser przeniesie dokładne liczby do formularza i nie prześle tekstu nigdzie. Wpis możesz poprawiać. Zajrzyj do Dziennika, Analiz i Zdrowia. Przycisk „Zobacz przykładowe dane” wypełnia tylko testowe posiłki.

> Dane lokalne w IndexedDB są przypisane do konkretnej przeglądarki i jej profilu. W trybie prywatnym/po wyczyszczeniu danych mogą zniknąć. Eksportuj okresowo kopię JSON.

## 2. Supabase — stworzenie bazy i logowania

1. Utwórz projekt na <https://supabase.com/dashboard> → **New project**.
2. Otwórz **SQL Editor → New query**, wklej całą zawartość `supabase/schema.sql` i uruchom. Powstaną `meals`, `health_measurements`, indeksy oraz reguły **RLS**. Bez RLS nie należy wystawiać danych zdrowotnych przez API.
3. Wejdź w **Authentication → Providers → Email**. Włącz logowanie e-mail/OTP (magic link). Na początek ogranicz publiczne tworzenie kont lub używaj jednego uprzednio założonego konta, ponieważ każde zalogowane konto może potencjalnie korzystać z płatnego AI.
4. Wejdź do **Authentication → URL Configuration** i dodaj do **Redirect URLs**:
   - `http://localhost:5173/**` (lokalnie),
   - `https://TWOJ-LOGIN.github.io/NAZWA-REPO/**` (po publikacji).
5. Otwórz **Project Settings → API Keys** (w niektórych wersjach: **Connect**). Skopiuj **Project URL** i **publishable key** `sb_publishable_...` (alternatywnie legacy `anon` key). To są klucze publiczne używane przez klienta, ale **NIE** `service_role`, **NIE** `sb_secret_...`.
6. Skopiuj `.env.example` do `.env.local` i wypełnij:

```ini
VITE_SUPABASE_URL=https://ABCDEF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

7. Uruchom ponownie `npm run dev`, przejdź do **Ustawienia → Supabase**, podaj adres e-mail i kliknij „Wyślij link logowania”. Po otworzeniu linku aplikacja powinna być zalogowana. Kliknij „Synchronizuj posiłki”.

**Uwaga:** tabela `health_measurements` przechowuje tylko 4 typy pomiarów, a aplikacja nie wysyła ich do Supabase bez osobnego zaznaczenia opcji w Ustawieniach.

## 3. OpenAI — klucz i funkcja backendowa

Nie wpisuj klucza OpenAI do `.env.local`, kodu React, pliku na GitHub ani lokalnego magazynu przeglądarki. Klucz ma być zapisany **jako sekret Supabase Edge Function**.

1. Wejdź na <https://platform.openai.com/api-keys>, utwórz klucz API w odpowiednim projekcie OpenAI i ustaw limit wydatków / alerty budżetowe.
2. Zainstaluj Supabase CLI (np. `npx supabase ...`; wymaga połączenia internetowego) i połącz projekt:

```bash
npx supabase login
npx supabase link --project-ref TWOJ_PROJECT_REF
```

3. Dodaj sekrety (bezpieczniej użyć `Supabase Dashboard → Edge Functions → Secrets` i wkleić tam klucz, bez zapisywania go w historii powłoki):

```bash
npx supabase secrets set OPENAI_API_KEY=sk-TWOJ_KLUCZ
npx supabase secrets set OPENAI_MODEL=gpt-4.1-mini
```

4. **Wymagane dla bezpiecznego dostępu do AI**: po pierwszym zalogowaniu skopiuj swój Supabase User ID z **Authentication → Users** i ogranicz wywołania AI tylko do tego użytkownika:

```bash
npx supabase secrets set AI_ALLOWED_USER_ID=TWOJ_USER_UUID
```

5. Wdróż do Supabase przygotowaną funkcję `meal-ai`:

```bash
npx supabase functions deploy meal-ai
```

6. W PWA zaloguj się i wybierz „Rozpoznaj AI”. Funkcja weryfikuje JWT użytkownika; w razie braku klucza pokazuje błąd. Po podaniu zdjęcia AI zwróci wartości do **formularza podglądu**, a nie automatyczny zapis.

Dokumentacja funkcji wykorzystuje `@supabase/server` z uwierzytelnieniem `auth: 'user'`, przy `verify_jwt = true`. W razie błędu 401 sprawdź token sesji, klucz projektu i konfigurację uprawnień — **nie wyłączaj weryfikacji JWT tylko po to, żeby 401 zniknęło**.

Modele: analiza tekstu i zdjęć `gpt-4.1-mini` (można nadpisać przez `OPENAI_MODEL`), transkrypcja `gpt-transcribe`. `store:false` blokuje opcjonalne przechowywanie odpowiedzi w Responses API, ale nie oznacza, że usługodawca nigdy nie przetwarza danych zgodnie z polityką usługi. Nie przesyłaj do AI całego archiwum Zdrowia.

## 4. Publikacja PWA na GitHub Pages

1. Utwórz repozytorium GitHub, np. `posilki`, i wgraj zawartość tego folderu (bez `node_modules`, `.env.local` i jakichkolwiek prywatnych danych).
2. W repozytorium wybierz **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Wybierz **Settings → Secrets and variables → Actions → Variables**, dodaj dwie *repository variables*:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Zrób commit/push do gałęzi `main`. Workflow `.github/workflows/pages.yml` zainstaluje pakiety, zbuduje PWA z poprawną ścieżką `/NAZWA-REPO/` i opublikuje stronę.
5. Otwórz `https://TWOJ-LOGIN.github.io/NAZWA-REPO/`. Na iPhonie w Safari użyj „Udostępnij → Dodaj do ekranu początkowego”.
6. Sprawdź logowanie i przycisk „Synchronizuj posiłki” na obu urządzeniach.

Strona GitHub Pages jest publicznie dostępna — **nie umieszczaj w repozytorium danych zdrowotnych ani sekretów**. Dostęp do danych w Supabase jest chroniony logowaniem i regułami RLS.

## 5. Eksport Apple Zdrowie

Na iPhonie otwórz **Zdrowie → profil → Eksportuj wszystkie dane zdrowotne**. Zapisz ZIP w Plikach, prześlij na Mac albo otwórz bezpośrednio w PWA. W zakładce Zdrowie kliknij „Wybierz ZIP / XML”.

Parser wybiera tylko:
- `HKQuantityTypeIdentifierBodyMass` (kg),
- `HKQuantityTypeIdentifierBloodGlucose` (mg/dL; mmol/L przeliczane × 18,0182),
- `HKQuantityTypeIdentifierBloodPressureSystolic` i `...Diastolic` (mmHg).

Dane są odczytywane po stronie klienta. Nie wysyłamy surowego XML ani ZIP do Supabase lub OpenAI. Ponowny import jest idempotentny względem tego samego rodzaju pomiaru, czasu, jednostki, wartości i źródła. W zakładce Zdrowie wybierz posiłek, żeby zobaczyć glukozę z okna −30 / +180 minut.

## 6. Testy i gotowość produkcyjna

```bash
npm run test
npm run build
```

Przed codziennym użyciem sprawdź: edycję i usuwanie wpisu, import 2 razy tego samego XML, logowanie i odświeżenie tokena, rozłączenie internetu w trakcie synchronizacji, wykres glukozy, a także koszty wywołań AI. Ten projekt jest **prototypem**, nie gotowym systemem medycznym. Przy większej skali dodaj migracje bazy, odzyskiwanie kopii JSON, limitowanie wywołań AI na użytkownika, obsługę konfliktów i monitoring błędów.

## Oficjalne materiały

- Supabase Functions: <https://supabase.com/docs/guides/functions>
- Uwierzytelnianie funkcji: <https://supabase.com/docs/guides/functions/auth>
- RLS: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- OpenAI Structured Outputs: <https://developers.openai.com/api/docs/guides/structured-outputs>
- OpenAI transkrypcja: <https://developers.openai.com/api/docs/guides/speech-to-text>

### Test danych demonstracyjnych

W folderze `samples/` znajduje się **fikcyjny** plik `zdrowie-demo.xml`. Możesz go wskazać w zakładce Zdrowie, aby przetestować importer i wykresy (bez wysyłania prawdziwych danych). W przypadku wybierania posiłku testowego upewnij się, że godziny mieszczą się w tym samym dniu co próbki.
