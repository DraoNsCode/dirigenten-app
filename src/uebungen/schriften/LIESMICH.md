# Schriften für den PDF-Export

Die Probenfolien betten Schriften als TrueType ein, damit Umlaute, kyrillische Silben und ♯/♭ im PDF stimmen.

| Datei | Quelle | Lizenz |
|---|---|---|
| `barlow-400.ttf`, `barlow-600.ttf` | Barlow (lateinische Untermenge aus `@fontsource/barlow`, in TrueType umgewandelt) | SIL Open Font License 1.1, siehe `OFL-Barlow.txt` |
| `dejavu-sans.ttf`, `dejavu-sans-bold.ttf` | DejaVu Sans, Untermenge: Latein, Kyrillisch, Satzzeichen, Pfeile, Musikzeichen | Bitstream-Vera-/DejaVu-Lizenz, siehe `LIZENZ-DejaVu.txt` |

Erzeugt mit fontTools (`pyftsubset`-Bereiche: U+0020-007E, U+00A0-017F, U+0301, U+0400-04FF, U+2010-2027, U+2030-205E, U+2190-21FF, U+2669-266F).
