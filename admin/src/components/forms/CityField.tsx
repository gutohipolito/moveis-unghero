"use client";

import {
  CIDADE_OUTRA_VALUE,
  CIDADES_SERRA_GAUCHA,
  citySelectValue,
} from "@/lib/address";

type CityFieldProps = {
  value: string;
  onChange: (cidade: string) => void;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
  id?: string;
  required?: boolean;
  /** Prefixo visual (ex.: formulário escuro público). */
  dark?: boolean;
};

/**
 * Select das cidades da Serra + “Outra…” com campo livre.
 * Evita “Farroupilha Rs” e padroniza acentos das cidades conhecidas.
 */
export default function CityField({
  value,
  onChange,
  className = "",
  selectClassName = "",
  inputClassName = "",
  id,
  required,
  dark = false,
}: CityFieldProps) {
  const selectVal = citySelectValue(value);
  const isOther = selectVal === CIDADE_OUTRA_VALUE;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <select
        id={id}
        required={required && !isOther}
        value={selectVal}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CIDADE_OUTRA_VALUE) {
            onChange(isOther ? value : "");
            return;
          }
          onChange(next);
        }}
        className={selectClassName}
      >
        <option value="">{dark ? "Selecione a cidade..." : "Selecione…"}</option>
        {CIDADES_SERRA_GAUCHA.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={CIDADE_OUTRA_VALUE}>Outra cidade…</option>
      </select>
      {isOther ? (
        <input
          type="text"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite a cidade"
          className={inputClassName || selectClassName}
        />
      ) : null}
    </div>
  );
}
