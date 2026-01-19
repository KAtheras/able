import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

type SummaryCard = {
  label: string;
  value: string;
  note?: string;
};

type TaxBenefitItem = {
  label: string;
  value: string;
};

type AmortizationRow = {
  period: string;
  contributions: string;
  withdrawals: string;
  earnings: string;
  balance: string;
  federalTax: string;
  stateTax: string;
  federalSaversCredit: string;
  stateTaxDeductionCredit: string;
};

export type ReportPdfProps = {
  logoSrc?: string;
  clientName?: string;
  reportTitle?: string;
  reportDate?: string;
  summaryCards: SummaryCard[];
  taxBenefits?: {
    items: TaxBenefitItem[];
    totalLabel?: string;
    totalValue: string;
  };
  amortizationRows: AmortizationRow[];
  footnotes?: string[];
  disclosures?: string[];
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 96,
    height: 40,
    objectFit: "contain",
    marginBottom: 10,
  },
  titleBlock: {
    alignItems: "center",
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 11,
    color: "#475569",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 8,
  },
  cardsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  card: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardFull: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#64748b",
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#2563eb",
    marginTop: 8,
  },
  cardNote: {
    fontSize: 9,
    color: "#475569",
    marginTop: 6,
  },
  taxBenefits: {
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  miniCardsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  miniCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  miniCardFull: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
  },
  miniCardLabel: {
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#64748b",
  },
  miniCardValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#2563eb",
    marginTop: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 18,
  },
  tableHeader: {
    backgroundColor: "#eff6ff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 6,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 6,
    fontSize: 8,
  },
  cellHeader: {
    fontSize: 6,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#475569",
  },
  footerSection: {
    marginTop: 8,
    gap: 6,
  },
  footerTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: "#64748b",
  },
  footerText: {
    fontSize: 8,
    color: "#475569",
    lineHeight: 1.4,
  },
});

export function ReportPdf({
  logoSrc,
  clientName,
  reportTitle = "ABLE Planning Report",
  reportDate,
  summaryCards,
  taxBenefits,
  amortizationRows,
  footnotes,
  disclosures,
}: ReportPdfProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          {logoSrc ? <Image style={styles.logo} src={logoSrc} /> : null}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{reportTitle}</Text>
            {clientName ? <Text style={styles.subtitle}>{clientName}</Text> : null}
            {reportDate ? <Text style={styles.subtitle}>{reportDate}</Text> : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.cardsWrap}>
          {summaryCards.map((card, index) => {
            const isEndingBalance = index === summaryCards.length - 1;
            return (
              <View key={card.label} style={isEndingBalance ? styles.cardFull : styles.card}>
                <Text style={styles.cardLabel}>{card.label}</Text>
                <Text style={styles.cardValue}>{card.value}</Text>
                {card.note ? <Text style={styles.cardNote}>{card.note}</Text> : null}
              </View>
            );
          })}
        </View>

        {taxBenefits ? (
          <>
            <Text style={styles.sectionTitle}>Tax Benefits</Text>
            <View style={styles.taxBenefits}>
              <View style={styles.miniCardsWrap}>
                {taxBenefits.items.map((item) => (
                  <View key={item.label} style={styles.miniCard}>
                    <Text style={styles.miniCardLabel}>{item.label}</Text>
                    <Text style={styles.miniCardValue}>{item.value}</Text>
                  </View>
                ))}
                <View style={styles.miniCardFull}>
                  <Text style={styles.miniCardLabel}>
                    {taxBenefits.totalLabel ?? "Total savings"}
                  </Text>
                  <Text style={styles.miniCardValue}>{taxBenefits.totalValue}</Text>
                </View>
              </View>
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Amortization Schedule</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.headerRow}>
              <Text style={[styles.cell, styles.cellHeader]}>Period</Text>
              <Text style={[styles.cell, styles.cellHeader]}>Contributions</Text>
              <Text style={[styles.cell, styles.cellHeader]}>Withdrawals</Text>
              <Text style={[styles.cell, styles.cellHeader]}>Earnings</Text>
              <Text style={[styles.cell, styles.cellHeader]}>Balance</Text>
              <Text style={[styles.cell, styles.cellHeader]}>Federal Tax</Text>
              <Text style={[styles.cell, styles.cellHeader]}>State Tax</Text>
              <Text style={[styles.cell, styles.cellHeader]}>Federal Savers Credit</Text>
              <Text style={[styles.cell, styles.cellHeader]}>State Tax Deduction / Credit</Text>
            </View>
          </View>
          {amortizationRows.map((row, index) => (
            <View
              key={`${row.period}-${index}`}
              style={[
                styles.tableRow,
                index === amortizationRows.length - 1 ? { borderBottomWidth: 0 } : {},
              ]}
            >
              <Text style={styles.cell}>{row.period}</Text>
              <Text style={styles.cell}>{row.contributions}</Text>
              <Text style={styles.cell}>{row.withdrawals}</Text>
              <Text style={styles.cell}>{row.earnings}</Text>
              <Text style={styles.cell}>{row.balance}</Text>
              <Text style={styles.cell}>{row.federalTax}</Text>
              <Text style={styles.cell}>{row.stateTax}</Text>
              <Text style={styles.cell}>{row.federalSaversCredit}</Text>
              <Text style={styles.cell}>{row.stateTaxDeductionCredit}</Text>
            </View>
          ))}
        </View>

        {(footnotes?.length || disclosures?.length) && (
          <View style={styles.footerSection}>
            {footnotes?.length ? (
              <>
                <Text style={styles.footerTitle}>Footnotes</Text>
                {footnotes.map((note, index) => (
                  <Text key={`footnote-${index}`} style={styles.footerText}>
                    {note}
                  </Text>
                ))}
              </>
            ) : null}
            {disclosures?.length ? (
              <>
                <Text style={styles.footerTitle}>Disclosures</Text>
                {disclosures.map((note, index) => (
                  <Text key={`disclosure-${index}`} style={styles.footerText}>
                    {note}
                  </Text>
                ))}
              </>
            ) : null}
          </View>
        )}
      </Page>
    </Document>
  );
}
