import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Global footer credit — appears on every page (front site, admin/employee, customer login & dashboard).
 * Subtle, small text; link opens in new tab.
 */
function FooterCredit() {
  const { t } = useTranslation();
  return (
    <p className="text-center text-xs text-muted-foreground">
      {t('footer.builtWith')} <Heart className="inline-block w-3 h-3 fill-current" aria-hidden /> by{" "}
      <a
        href="https://bankaitech.co"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
      >
        BankaiTech
      </a>
    </p>
  );
}

export default FooterCredit;
