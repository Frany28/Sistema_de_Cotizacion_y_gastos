import TablaArchivos from "../../components/ComponentesArchivos/TablaArchivos";

function ArchivosPage() {
  return (
    <div className="flex w-full h-full gap-4 min-h-0">
      <div className="flex flex-col w-full h-full p-5 gap-3 min-h-0">
        <TablaArchivos />
      </div>
    </div>
  );
}

export default ArchivosPage;
