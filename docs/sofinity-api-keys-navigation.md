# Navigace k API klíčům v Sofinity admin

## Přímý odkaz
```
https://app.sofinity.com/settings/api-keys
```

## Navigační cesta z hlavní stránky

### Varianta 1: Přes Settings menu
1. **Přihlášení** do `app.sofinity.com`
2. **Hlavní dashboard** - po přihlášení se zobrazí
3. **Settings/Nastavení** - klikněte na ikonu nastavení nebo menu
   - Může být v horní liště (gear ikona)
   - Nebo v bočním menu jako "Settings" / "Nastavení"
4. **API Keys** - v sekci nastavení najděte položku "API Keys" / "API klíče"

### Varianta 2: Přes Account/Profile menu
1. **Přihlášení** do `app.sofinity.com`
2. **Profile/Account menu** - klikněte na své jméno nebo avatar
3. **Account Settings** - zvolte možnost nastavení účtu
4. **API Keys** - najděte sekci pro správu API klíčů

### Varianta 3: Přes administrační panel
1. **Přihlášení** do `app.sofinity.com`
2. **Admin Panel** - pokud máte admin práva
3. **Integrace / Integrations** - sekce pro externí integrace
4. **API Management** - správa API přístupů a klíčů

## Funkcionalita sekce API Keys

### Očekávané možnosti:
- **Zobrazení existujících klíčů** - seznam aktuálních API klíčů
- **Generování nového klíče** - tlačítko "Generate New Key" / "Vytvořit nový klíč"
- **Revokace klíčů** - možnost zrušit existující klíče
- **Nastavení oprávnění** - definice scope/rozsahu přístupů pro klíče

### Informace o klíčích:
- **Název/Label** klíče
- **Datum vytvoření**
- **Posledním použití**
- **Status** (aktivní/neaktivní)
- **Oprávnění/Scope**

## Ověření správné cesty

**Důležité:** Tyto instrukce jsou založené na běžných vzorcích admin rozhraní. 
Pro přesnou navigaci je třeba ověřit:

1. **Aktuální URL struktura** - zkontrolujte, zda `https://app.sofinity.com/settings/api-keys` skutečně existuje
2. **Menu struktura** - názvy menu položek se mohou lišit
3. **Oprávnění** - ujistěte se, že váš účet má práva pro správu API klíčů
4. **Lokalizace** - rozhraní může být v češtině nebo angličtině

## Alternatívní způsoby přístupu

Pokud výše uvedené cesty nefungují, zkuste:

1. **Vyhledávání** - použijte vyhledávací pole v admin panelu s klíčovými slovy "API", "keys", "klíče"
2. **Dokumentace** - zkontrolujte Sofinity dokumentaci nebo help sekci
3. **Support** - kontaktujte Sofinity support pro přesné instrukce
4. **URL test** - zkuste různé variace URL:
   - `/settings/api`
   - `/admin/api-keys`
   - `/account/api-keys`
   - `/integrations/api-keys`

## Poznámky pro vývojáře

Při implementaci tlačítka "Vytvořit API klíč v Sofinity":
- Použijte `target="_blank"` pro otevření v novém tabu
- Zvažte `rel="noopener noreferrer"` pro bezpečnost
- Přidejte tooltip s vysvětlením funkce
- Ikona klíče (Key icon) by měla být konzistentní s designem aplikace