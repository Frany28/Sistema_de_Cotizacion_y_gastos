import React, { useState } from "react";
import ClienteSelectorCXC from "../../components/ComponentesCXC/ClienteSelectorCXC.jsx";
import TablaCuentasPorCobrar from "../../components/ComponentesCXC/TablaCuentasPorCobrar.jsx";
import TotalesCXC from "../../components/ComponentesCXC/TotalesCXC.jsx";
const CXC = () => {
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefreshTotals = () => setRefreshKey((k) => k + 1);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-white">Cuentas por Cobrar</h1>

      <div className="flex flex-wrap md:flex-nowrap justify-between gap-4 mb-6">
        <div className="flex-1 p-6 ">
          <ClienteSelectorCXC
            onClienteSeleccionado={setClienteIdSeleccionado}
          />
        </div>

        <div className="flex-1 p-6 ">
          <TotalesCXC
            clienteId={clienteIdSeleccionado}
            refreshKey={refreshKey}
          />
        </div>
      </div>

      <TablaCuentasPorCobrar
        clienteId={clienteIdSeleccionado}
        onRefreshTotals={handleRefreshTotals}
      />
    </div>
  );
};

export default CXC;
