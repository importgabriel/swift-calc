"use client";

import { useState, useCallback } from "react";
import Display     from "./Display";
import Button      from "./Button";
import HistoryPanel from "./HistoryPanel";
import type { ButtonVariant } from "./Button";

// ── Types (mirroring shared interfaces from other agents) ────────────────────

/** Matches CalculationEntry from database / api agents — do not redefine there. */
interface CalculationEntry {
  id: string;
  expression: string;
  result: string;
  created_at: string;
}

/** Matches PostHistoryBody from api agent. */
interface PostHistoryBody {
  expression: string;
  result: string;
}

type Operator = "+" | "-" | "×" | "÷";

// ── Pure calculation helper ───────────────────────────────────────────────────

function applyOperator(prev: number, curr: number, op: Operator): number {
  switch (op) {
    case "+": return prev + curr;
    case "-": return prev - curr;
    case "×": return prev * curr;
    case "÷": return curr !== 0 ? prev / curr : NaN;
  }
}

/** Converts a raw JS number to a clean display string (avoids floating-point noise). */
function formatNumber(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "Error";
  // toPrecision(12) kills floating-point noise, then strip trailing zeros
  return String(parseFloat(n.toPrecision(12)));
}

// ── Button layout definition ─────────────────────────────────────────────────

interface ButtonDef {
  label: string;
  variant?: ButtonVariant;
  colSpan?: 2;
  action:
    | { type: "digit";    value: string }
    | { type: "decimal" }
    | { type: "operator"; value: Operator }
    | { type: "clear" }
    | { type: "toggleSign" }
    | { type: "percentage" }
    | { type: "equals" };
}

const BUTTON_LAYOUT: ButtonDef[] = [
  // Row 1 — action keys
  { label: "C",   variant: "action",   action: { type: "clear" } },
  { label: "+/-", variant: "action",   action: { type: "toggleSign" } },
  { label: "%",   variant: "action",   action: { type: "percentage" } },
  { label: "÷",   variant: "operator", action: { type: "operator", value: "÷" } },
  // Row 2
  { label: "7", action: { type: "digit", value: "7" } },
  { label: "8", action: { type: "digit", value: "8" } },
  { label: "9", action: { type: "digit", value: "9" } },
  { label: "×", variant: "operator", action: { type: "operator", value: "×" } },
  // Row 3
  { label: "4", action: { type: "digit", value: "4" } },
  { label: "5", action: { type: "digit", value: "5" } },
  { label: "6", action: { type: "digit", value: "6" } },
  { label: "-", variant: "operator", action: { type: "operator", value: "-" } },
  // Row 4
  { label: "1", action: { type: "digit", value: "1" } },
  { label: "2", action: { type: "digit", value: "2" } },
  { label: "3", action: { type: "digit", value: "3" } },
  { label: "+", variant: "operator", action: { type: "operator", value: "+" } },
  // Row 5 — zero spans two columns
  { label: "0", variant: "zero", colSpan: 2, action: { type: "digit", value: "0" } },
  { label: ".",  action: { type: "decimal" } },
  { label: "=",  variant: "equals", action: { type: "equals" } },
];

// ── Calculator component ─────────────────────────────────────────────────────

export default function Calculator() {
  // Display state
  const [currentValue,      setCurrentValue]      = useState("0");
  const [expression,        setExpression]         = useState("");
  // Operator / operand state
  const [pendingOperator,   setPendingOperator]    = useState<Operator | null>(null);
  const [storedValue,       setStoredValue]        = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand]  = useState(false);
  // History (session-local; also persisted via API best-effort)
  const [localHistory,      setLocalHistory]       = useState<CalculationEntry[]>([]);

  // ── Digit / decimal input ──────────────────────────────────────────────────

  const inputDigit = useCallback((digit: string) => {
    setCurrentValue((prev) => {
      if (waitingForOperand) {
        setWaitingForOperand(false);
        return digit;
      }
      if (prev === "0") return digit;
      if (prev.replace("-", "").length >= 12) return prev; // cap length
      return prev + digit;
    });
  }, [waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setCurrentValue("0.");
      setWaitingForOperand(false);
      return;
    }
    setCurrentValue((prev) => (prev.includes(".") ? prev : prev + "."));
  }, [waitingForOperand]);

  // ── Clear ─────────────────────────────────────────────────────────────────

  const clear = useCallback(() => {
    setCurrentValue("0");
    setExpression("");
    setPendingOperator(null);
    setStoredValue(null);
    setWaitingForOperand(false);
  }, []);

  // ── Modifier functions ────────────────────────────────────────────────────

  const toggleSign = useCallback(() => {
    setCurrentValue((prev) => {
      if (prev === "0") return "0";
      return prev.startsWith("-") ? prev.slice(1) : "-" + prev;
    });
  }, []);

  const percentage = useCallback(() => {
    setCurrentValue((prev) => {
      const n = parseFloat(prev);
      return isNaN(n) ? prev : formatNumber(n / 100);
    });
  }, []);

  // ── Operator ──────────────────────────────────────────────────────────────

  const handleOperator = useCallback((op: Operator) => {
    const current = parseFloat(currentValue);

    if (storedValue !== null && pendingOperator && !waitingForOperand) {
      // Chain: evaluate the in-flight operation first
      const prev   = parseFloat(storedValue);
      const result = applyOperator(prev, current, pendingOperator);
      const resultStr = formatNumber(result);
      setCurrentValue(resultStr);
      setStoredValue(resultStr);
      setExpression(`${resultStr} ${op}`);
    } else {
      setStoredValue(currentValue);
      setExpression(`${currentValue} ${op}`);
    }

    setPendingOperator(op);
    setWaitingForOperand(true);
  }, [currentValue, storedValue, pendingOperator, waitingForOperand]);

  // ── Equals ────────────────────────────────────────────────────────────────

  const handleEquals = useCallback(async () => {
    if (pendingOperator === null || storedValue === null) return;

    const prev    = parseFloat(storedValue);
    const current = parseFloat(currentValue);
    const result  = applyOperator(prev, current, pendingOperator);
    const resultStr     = formatNumber(result);
    const expressionStr = `${storedValue} ${pendingOperator} ${currentValue}`;

    setCurrentValue(resultStr);
    setExpression(`${expressionStr} =`);
    setStoredValue(null);
    setPendingOperator(null);
    setWaitingForOperand(true);

    if (resultStr === "Error") return;

    // Record in local session history (shown immediately)
    const entry: CalculationEntry = {
      id:         crypto.randomUUID(),
      expression: expressionStr,
      result:     resultStr,
      created_at: new Date().toISOString(),
    };
    setLocalHistory((prev) => [entry, ...prev]);

    // Best-effort persist via API (fails gracefully when backend isn't wired up)
    try {
      const body: PostHistoryBody = {
        expression: expressionStr,
        result:     resultStr,
      };
      await fetch("/api/history", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
    } catch {
      // Silently ignore — local history is already updated above
    }
  }, [pendingOperator, storedValue, currentValue]);

  // ── Dispatch button actions ───────────────────────────────────────────────

  const dispatch = useCallback((def: ButtonDef) => {
    switch (def.action.type) {
      case "digit":      return inputDigit(def.action.value);
      case "decimal":    return inputDecimal();
      case "operator":   return handleOperator(def.action.value);
      case "clear":      return clear();
      case "toggleSign": return toggleSign();
      case "percentage": return percentage();
      case "equals":     return handleEquals();
    }
  }, [inputDigit, inputDecimal, handleOperator, clear, toggleSign, percentage, handleEquals]);

  // Use a history result as the new input
  const handleSelectHistoryEntry = useCallback((result: string) => {
    setCurrentValue(result);
    setWaitingForOperand(false);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-900 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start gap-4 w-full max-w-2xl">

        {/* ── Calculator panel ── */}
        <div className="bg-zinc-800 rounded-3xl overflow-hidden shadow-2xl w-full sm:w-72 flex-shrink-0">
          {/* Display */}
          <Display expression={expression} currentValue={currentValue} />

          {/* Button grid */}
          <div className="px-4 pb-6 grid grid-cols-4 gap-3">
            {BUTTON_LAYOUT.map((btn, idx) => {
              const isActiveOperator =
                (btn.variant === "operator") &&
                pendingOperator === (btn.action as { value?: Operator }).value &&
                waitingForOperand;

              return (
                <div
                  key={idx}
                  className={btn.colSpan === 2 ? "col-span-2" : "col-span-1"}
                >
                  <Button
                    label={btn.label}
                    variant={btn.variant ?? "number"}
                    active={isActiveOperator}
                    onClick={() => dispatch(btn)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── History panel ── */}
        <div
          className="bg-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex-1 w-full"
          style={{ height: "520px" }}
        >
          <HistoryPanel
            localHistory={localHistory}
            onSelectEntry={handleSelectHistoryEntry}
          />
        </div>

      </div>
    </div>
  );
}
