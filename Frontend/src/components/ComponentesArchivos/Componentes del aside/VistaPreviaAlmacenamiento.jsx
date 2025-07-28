import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const VistaPreviaAlmacenamiento = ({ usado, total }) => {
  const disponible = total - usado;
  const porcentajeUsado = ((usado / total) * 100).toFixed(0);

  const datos = [
    { name: "Usado", value: usado },
    { name: "Disponible", value: disponible },
  ];

  const colores = ["#1A56DB", "#4B5563"]; // azul y gris

  const formatearTamano = (bytes) => {
    if (bytes == null || isNaN(bytes)) return "-";
    const unidades = ["B", "KB", "MB", "GB"];
    let i = 0;
    let valor = bytes;
    while (valor >= 1024 && i < unidades.length - 1) {
      valor /= 1024;
      i++;
    }
    return `${valor.toFixed(1)} ${unidades[i]}`;
  };

  return (
    <div className="w-full sm:w-72 lg:w-80 min-h-[10rem] bg-gray-700 rounded-2xl p-4 flex flex-col justify-between">
      <h3 className="text-white text-base font-semibold mb-2">
        Almacenamiento
      </h3>

      <div className="flex items-center gap-4">
        <div className="w-20 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={datos}
                innerRadius={"70%"}
                outerRadius={"100%"}
                dataKey="value"
              >
                {datos.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colores[index % colores.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col text-sm text-white gap-1">
          <p>
            <span className="text-gray-400">Usado: </span>
            {formatearTamano(usado)}
          </p>
          <p>
            <span className="text-gray-400">Disponible: </span>
            {formatearTamano(disponible)}
          </p>
          <p>
            <span className="text-gray-400">Total: </span>
            {formatearTamano(total)}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${porcentajeUsado}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-300 mt-1 text-right">
          {porcentajeUsado}% usado
        </p>
      </div>
    </div>
  );
};

export default VistaPreviaAlmacenamiento;
