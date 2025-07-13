import React, { useState } from "react";
import ClienteSelectorCXC from "../../components/ComponentesCXC/ClienteSelectorCXC.jsx";
import TablaCuentasPorCobrar from "../../components/ComponentesCXC/TablaCuentasPorCobrar.jsx";
import TotalesCXC from "../../components/ComponentesCXC/TotalesCXC.jsx";

const CXC = () => {
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefreshTotals = () => setRefreshKey((k) => k + 1);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white">
        Cuentas por Cobrar
      </h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/2">
          <ClienteSelectorCXC
            onClienteSeleccionado={setClienteIdSeleccionado}
          />
        </div>

        <div className="w-full md:w-1/2">
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
