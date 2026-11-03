# Publikacja na GitHub Pages bez uruchamiania npm na Macu

1. Na GitHub utworz repozytorium `my-food` (na darmowym planie publiczne, bez README).
2. Zainstaluj GitHub Desktop, zaloguj sie i wybierz File > Clone Repository; sklonuj repozytorium `my-food`.
3. Rozpakuj ZIP. W Finderze otworz folder `posilki-pwa`, wlacz widocznosc ukrytych plikow `Cmd + Shift + .`, skopiuj **zawartosc** tego folderu (takze `.github`, `.gitignore`, `.env.example`) do folderu sklonowanego repozytorium `my-food`. Nie kopiuj folderu `posilki-pwa` jako jednego podfolderu.
4. GitHub Desktop: Summary `First version`, Commit to main, Push origin.
5. Na GitHub: Settings > Secrets and variables > Actions > Variables > New repository variable:
   - `VITE_SUPABASE_URL` = adres `https://...supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = klucz `sb_publishable_...`
   To dane publiczne w aplikacji; nigdy nie wrzucaj `service_role`, `sb_secret_*` ani klucza OpenAI.
6. Na GitHub: Settings > Pages > Build and deployment > Source > GitHub Actions.
7. Na GitHub: Actions > Publish PWA > Run workflow (branch main). Oczekuj sukcesu krokow build i deploy; adres strony: `https://LOGIN.github.io/my-food/`.
8. Supabase: Authentication > URL Configuration: Site URL ustaw na `https://LOGIN.github.io/my-food/`; do Redirect URLs dodaj `https://LOGIN.github.io/my-food/**`.
9. Sprawdz strone, logowanie email i synchronizacje. AI zacznie dzialac dopiero po wdrozeniu Edge Function `meal-ai` i dodaniu klucza OpenAI do jej sekretow.

GitHub Pages jest publicznym hostingiem statycznym. Posiłki i pomiary nie powinny byc trzymane w repozytorium; ich dostep przez Supabase wymaga poprawnych polityk RLS. Jezeli GitHub Action pokazuje blad kompilacji, projekt wymaga poprawki w kodzie; paczka nie byla przetestowana end-to-end na prawdziwym npm.
