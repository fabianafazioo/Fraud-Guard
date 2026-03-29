import json
import math
import os
import re
import sys
from collections import Counter, defaultdict

import numpy as np
import pandas as pd
from pypdf import PdfReader
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


MANUAL_TERMS = [
    "manual override",
    "manual adjustment",
    "year-end adjustment",
    "override",
    "adjustment",
    "admin"
]


def safe_value(value):
    if pd.isna(value):
        return None
    if isinstance(value, (np.integer, np.int64, np.int32)):
        return int(value)
    if isinstance(value, (np.floating, np.float64, np.float32)):
        number = float(value)
        return round(number, 4)
    return str(value)


def parse_pdf_to_dataframe(file_path):
    reader = PdfReader(file_path)
    lines = []
    for page in reader.pages:
        text = page.extract_text() or ""
        for line in text.splitlines():
            cleaned = line.strip()
            if cleaned:
                lines.append(cleaned)

    rows = []
    for idx, line in enumerate(lines[:400], start=1):
        number_match = re.findall(r"-?\$?\d[\d,]*(?:\.\d+)?", line)
        rows.append(
            {
                "line_number": idx,
                "line_text": line,
                "amount": float(number_match[0].replace("$", "").replace(",", "")) if number_match else np.nan,
            }
        )
    return [{"file_name": os.path.basename(file_path), "sheet_name": os.path.basename(file_path), "df": pd.DataFrame(rows)}]


def load_file(file_path):
    lower = file_path.lower()
    base = os.path.basename(file_path)

    if lower.endswith(".csv"):
        return [{"file_name": base, "sheet_name": base, "df": pd.read_csv(file_path)}]

    if lower.endswith(".xlsx") or lower.endswith(".xls"):
        workbook = pd.read_excel(file_path, sheet_name=None)
        sheets = []
        for sheet_name, df in workbook.items():
            if df is None or df.empty:
                continue
            label = base if len(workbook) == 1 else f"{base} - {sheet_name}"
            sheets.append({"file_name": label, "sheet_name": sheet_name, "df": df})
        return sheets

    if lower.endswith(".pdf"):
        return parse_pdf_to_dataframe(file_path)

    raise ValueError(f"Unsupported file type: {base}")


def clean_dataframe(df):
    df = df.copy()
    df.columns = [str(col).strip() for col in df.columns]
    df = df.dropna(how="all")
    df = df.replace({np.nan: None})
    return df


def classify_area(file_name, df):
    headers = " ".join([c.lower() for c in df.columns])
    name = file_name.lower()

    if any(term in headers for term in ["salary", "employee", "bank_account", "payroll"]) or "payroll" in name or "hr_" in name:
        return "Payroll"
    if any(term in headers for term in ["deal_value", "discount", "sales_rep", "deal_id"]) or "sales" in name:
        return "Sales"
    if any(term in headers for term in ["monthly_fee", "customer_id", "plan_type", "monthly_logins"]) or "customer" in name:
        return "Customer Revenue"
    if any(term in headers for term in ["recognized_revenue", "billed_revenue", "deferred_revenue", "manual_adjustments"]) or "financial" in name:
        return "Financial Statements"
    if any(term in headers for term in ["credit", "debit", "entered_by", "account_name"]) or "ledger" in name:
        return "General Ledger"
    if any(term in headers for term in ["transaction_id", "amount", "transaction_type", "balance"]) or "bank" in name:
        return "Bank Activity"
    return "General Review"


DATASET_CONFIG = {
    "Payroll": {
        "features": ["salary", "monthly_logins"],
        "contamination": 0.08,
    },
    "Sales": {
        "features": ["deal_value", "discount"],
        "contamination": 0.08,
    },
    "Customer Revenue": {
        "features": ["monthly_fee", "monthly_logins"],
        "contamination": 0.08,
    },
}


def numeric_columns(df):
    cols = []
    for col in df.columns:
        series = pd.to_numeric(df[col], errors="coerce")
        if series.notna().sum() >= max(4, int(len(df) * 0.35)):
            cols.append(col)
    return cols


def choose_features(area, df):
    config = DATASET_CONFIG.get(area)
    if config:
        features = [col for col in config["features"] if col in df.columns]
        if len(features) >= 2:
            return features, config["contamination"]

    nums = numeric_columns(df)
    if len(nums) >= 2:
        return nums[: min(4, len(nums))], 0.12 if len(df) < 40 else 0.08
    if len(nums) == 1:
        return nums, 0.12 if len(df) < 40 else 0.08
    return [], 0.0


def row_text(row):
    parts = []
    for key, value in row.items():
        if value is None:
            continue
        parts.append(f"{key}: {value}")
    return " | ".join(parts).lower()


def get_reason_flags(df, area):
    reasons_per_row = [[] for _ in range(len(df))]
    counts = Counter()

    def add_reason(index, reason):
        if reason not in reasons_per_row[index]:
            reasons_per_row[index].append(reason)
            counts[reason] += 1

    row_texts = [row_text(record) for record in df.to_dict(orient="records")]

    for i, text in enumerate(row_texts):
        if any(term in text for term in MANUAL_TERMS):
            add_reason(i, "Manual adjustment or override")

    for column in df.columns:
        lower = column.lower()
        series_num = pd.to_numeric(df[column], errors="coerce")

        if lower == "discount":
            for i, value in enumerate(series_num):
                if pd.notna(value) and float(value) >= 40:
                    add_reason(i, "Unusually high discount")

        if "logins" in lower:
            for i, value in enumerate(series_num):
                if pd.notna(value) and float(value) == 0:
                    add_reason(i, "Zero logins")

        if lower in {"entered_by", "approved_by", "created_by"}:
            series = df[column].astype(str).str.lower()
            for i, value in enumerate(series):
                if value == "admin":
                    add_reason(i, "Admin-entered record")

        if series_num.notna().sum() >= 6:
            q1 = series_num.quantile(0.25)
            q3 = series_num.quantile(0.75)
            iqr = q3 - q1
            upper = q3 + 1.5 * iqr
            lower_bound = q1 - 1.5 * iqr
            for i, value in enumerate(series_num):
                if pd.notna(value) and (value > upper or value < lower_bound):
                    add_reason(i, f"Outlier in {column}")

    # Duplicate rows
    duplicates = df.astype(str).duplicated(keep=False)
    for i, value in enumerate(duplicates):
        if bool(value):
            add_reason(i, "Duplicate record")

    if area == "Bank Activity" and "amount" in df.columns:
        amounts = pd.to_numeric(df["amount"], errors="coerce")
        frequency = amounts.round(2).value_counts(dropna=True)
        repeated = set(frequency[frequency >= 3].index.tolist())
        for i, value in enumerate(amounts.round(2)):
            if pd.notna(value) and value in repeated:
                add_reason(i, "Repeated transaction amount")

    if area == "Financial Statements" and "manual_adjustments" in df.columns:
        adjustments = pd.to_numeric(df["manual_adjustments"], errors="coerce")
        threshold = adjustments.mean() + adjustments.std(ddof=0)
        for i, value in enumerate(adjustments):
            if pd.notna(value) and value > threshold:
                add_reason(i, "High manual adjustment")

    return reasons_per_row, counts


def run_isolation_forest(df, area):
    features, contamination = choose_features(area, df)
    if not features:
        return np.zeros(len(df), dtype=int), np.zeros(len(df), dtype=float), []

    frame = df[features].copy()
    for col in features:
        frame[col] = pd.to_numeric(frame[col], errors="coerce")
        if frame[col].isna().all():
            return np.zeros(len(df), dtype=int), np.zeros(len(df), dtype=float), []
        frame[col] = frame[col].fillna(frame[col].median())

    scaled = StandardScaler().fit_transform(frame)
    model = IsolationForest(contamination=contamination, random_state=42)
    predictions = model.fit_predict(scaled)
    raw_scores = -model.score_samples(scaled)
    return predictions, raw_scores, features


def analyze_dataset(file_name, df):
    df = clean_dataframe(df)
    if df.empty:
        return None

    area = classify_area(file_name, df)
    predictions, iso_scores, features = run_isolation_forest(df, area)
    reasons_per_row, reason_counts = get_reason_flags(df, area)

    flagged = []
    for idx, record in enumerate(df.to_dict(orient="records"), start=1):
        reasons = list(reasons_per_row[idx - 1])
        model_flagged = len(predictions) and predictions[idx - 1] == -1
        score = 0
        if model_flagged:
            reasons.insert(0, f"Isolation Forest anomaly ({', '.join(features)})")
            score += 3
        score += min(4, len(reasons_per_row[idx - 1]))

        if score >= 3:
            preview = {k: safe_value(v) for k, v in list(record.items())[:6]}
            flagged.append(
                {
                    "fileName": file_name,
                    "rowNumber": idx,
                    "area": area,
                    "riskScore": score,
                    "reasons": reasons[:5],
                    "preview": preview,
                    "modelScore": round(float(iso_scores[idx - 1]), 4) if len(iso_scores) else 0.0,
                }
            )

    flagged.sort(key=lambda item: (item["riskScore"], item["modelScore"]), reverse=True)
    flagged_count = len(flagged)
    total_rows = len(df)
    flagged_percent = round((flagged_count / total_rows) * 100, 1) if total_rows else 0.0

    summary_note = {
        "Payroll": "Suspicious payroll records were found, including unusual salary or login behavior.",
        "Sales": "Suspicious sales records were found, including unusual discounts or deal values.",
        "Customer Revenue": "Suspicious customer records were found, including abnormal fee or login patterns.",
        "Financial Statements": "Suspicious financial statement records were found, including high manual adjustments or revenue anomalies.",
        "General Ledger": "Suspicious ledger records were found, including duplicates, admin activity, or unusual amounts.",
        "Bank Activity": "Suspicious bank records were found, including repeated amounts or anomalous transactions.",
        "General Review": "Suspicious records were found that deserve manual review."
    }[area]

    return {
        "fileName": file_name,
        "area": area,
        "rowCount": total_rows,
        "flaggedCount": flagged_count,
        "flaggedPercent": flagged_percent,
        "reasons": [{"name": key, "value": value} for key, value in reason_counts.most_common()],
        "topFindings": flagged[:8],
        "note": summary_note,
    }


def build_report(file_summaries):
    file_summaries = [item for item in file_summaries if item]
    total_rows = sum(item["rowCount"] for item in file_summaries)
    flagged_records = sum(item["flaggedCount"] for item in file_summaries)
    fraud_percent = round((flagged_records / total_rows) * 100, 1) if total_rows else 0.0
    clear_percent = round(max(0.0, 100.0 - fraud_percent), 1)

    if fraud_percent >= 35:
        risk_level = "High Risk"
        risk_tone = "danger"
    elif fraud_percent >= 15:
        risk_level = "Medium Risk"
        risk_tone = "warn"
    else:
        risk_level = "Low Risk"
        risk_tone = "safe"

    top_findings = []
    reason_rollup = Counter()
    suspicious_areas = []

    for item in file_summaries:
        top_findings.extend(item["topFindings"])
        for reason in item["reasons"]:
            reason_rollup[reason["name"]] += reason["value"]
        suspicious_areas.append(
            {
                "fileName": item["fileName"],
                "area": item["area"],
                "note": item["note"]
            }
        )

    top_findings.sort(key=lambda x: (x["riskScore"], x["modelScore"]), reverse=True)

    primary_area = None
    if file_summaries:
        primary_area = max(file_summaries, key=lambda x: x["flaggedCount"])["area"]

    if risk_level == "High Risk":
        narrative = "The uploaded files show a strong concentration of suspicious activity. Several records were flagged by the Isolation Forest model and by fraud-specific rules, so these results deserve immediate review."
    elif risk_level == "Medium Risk":
        narrative = "The uploaded files contain a noticeable amount of suspicious activity. The results do not prove fraud on their own, but they do identify rows that should be investigated first."
    else:
        narrative = "The uploaded files show a lower concentration of suspicious activity, but the flagged rows still deserve attention because anomaly detection is designed to surface unusual behavior early."

    charts = {
        "gauge": [
            {"name": "Flagged", "value": fraud_percent},
            {"name": "Clear", "value": clear_percent},
        ],
        "byFile": [
            {"name": item["fileName"][:28], "flagged": item["flaggedCount"]} for item in file_summaries
        ],
        "reasons": [
            {"name": key if len(key) <= 24 else key[:24] + "…", "value": value}
            for key, value in reason_rollup.most_common(8)
        ],
    }

    return {
        "generatedAt": pd.Timestamp.utcnow().isoformat(),
        "riskLevel": risk_level,
        "riskTone": risk_tone,
        "fraudPercent": fraud_percent,
        "clearPercent": clear_percent,
        "flaggedRecords": flagged_records,
        "totalRows": total_rows,
        "filesAnalyzed": len(file_summaries),
        "primaryArea": primary_area,
        "narrativeSummary": narrative,
        "suspiciousAreas": suspicious_areas,
        "fileSummaries": file_summaries,
        "topFindings": top_findings[:12],
        "charts": charts,
    }


def main(paths):
    datasets = []
    for file_path in paths:
        for loaded in load_file(file_path):
            datasets.append(analyze_dataset(loaded["file_name"], loaded["df"]))

    report = build_report(datasets)
    print(json.dumps(report))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No files provided."}))
        sys.exit(1)

    try:
        main(sys.argv[1:])
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
