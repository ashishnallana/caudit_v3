"use client";

interface Column<T> {
  key: keyof T;
  label: string;
  format?: (value: any) => string | number;
}

interface DataTableProps<T extends Record<string, any>> {
  data: T[];
  columns: Column<T>[];
  keyField?: keyof T;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg shadow-md">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((item, index) => {
            const rowKey = keyField ? String(item[keyField]) : index;
            return (
              <tr key={rowKey} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={`${rowKey}-${String(column.key)}`}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {column.format
                      ? column.format(item[column.key])
                      : String(item[column.key])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
