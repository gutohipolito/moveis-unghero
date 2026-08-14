"use client";

import { useEffect, useState } from "react";
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
  const canonical = citySelectValue(value);
  const [pickingOther, setPickingOther] = useState(
    () => Boolean(value) && citySelectValue(value) === CIDADE_OUTRA_VALUE
  );

  useEffect(() => {
    if (value && citySelectValue(value) !== CIDADE_OUTRA_VALUE) {
      setPickingOther(false);
    }
  }, [value]);

  const isOther =
    pickingOther || (Boolean(value) && canonical === CIDADE_OUTRA_VALUE);
  const selectVal = isOther ? CIDADE_OUTRA_VALUE : canonical;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <select
        id={id}
        required={required && !isOther}
        value={selectVal}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CIDADE_OUTRA_VALUE) {
            setPickingOther(true);
            if (!isOther) onChange("");
            return;
          }
          setPickingOther(false);
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
          placeholder="Digite o nome da cidade"
          autoComplete="address-level2"
          className={inputClassName || selectClassName}
        />
      ) : null}
    </div>
  );
}
