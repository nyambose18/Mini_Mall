export default function SpecGrid({ specs }) {
  const rows = specs.filter((row) => row && row.value);
  if (!rows.length) return null;

  return (
    <dl className="spec-grid">
      {rows.map((row) => (
        <div key={row.label} className="spec-row">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}