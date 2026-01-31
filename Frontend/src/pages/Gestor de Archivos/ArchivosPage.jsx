import TablaArchivos from "../../components/ComponentesArchivos/TablaArchivos";

function ArchivosPage() {
  return (
    <>
      <div className="flex w-full h-full gap-4">
        <div className="gap-3 flex flex-col w-full h-full p-5">
          <TablaArchivos />
        </div>
      </div>
    </>
  );
}

export default ArchivosPage;
