"use client";

import { useId, useMemo } from "react";
import { bairroSuggestionsForCity } from "@/lib/address";

type BairroFieldProps = {
  value: string;
  onChange: (bairro: string) => void;
  cidade?: string;
  className?: string;
  listId?: string;
  placeholder?: string;
};

/**
 * Input de bairro com datalist (sugestões de Farroupilha ou lista extra).
 * Continua aceitando digitação livre para bairros novos.
 */
export default function BairroField({
  value,
  onChange,
  cidade = "",
  className = "",
  listId,
  placeholder = "Bairro",
}: BairroFieldProps) {
  const autoId = useId();
  const id = listId || `bairro-${autoId}`;
  const suggestions = useMemo(() => bairroSuggestionsForCity(cidade), [cidade]);

  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={suggestions.length > 0 ? id : undefined}
        placeholder={placeholder}
        className={className}
        autoComplete="address-level3"
      />
      {suggestions.length > 0 ? (
        <datalist id={id}>
          {suggestions.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}
