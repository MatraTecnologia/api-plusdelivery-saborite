/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react";
interface Pedidos{
  id: string,
  cliente: string,
  dataHora: string,
  status:string ,
  detalhes:string 
}
export default function Home() {
  const [pedidos, setPedidos] = useState<Pedidos[]|[]>([]);
  const [pedidoDetalhes, setPedidoDetalhes] = useState<Pedidos|null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState("");

  // Função para ativar o script e coletar os pedidos
  const ativarScript = async () => {
    setLoading(true);
    setShowModal(true); // Exibe o modal com o progresso
    setProgress(0); // Resetando o progresso
    setLog(""); // Limpando o log

    try {
      const response = await fetch('/api/scrape');
      const data = await response.json();
      setPedidos(data);

      // Simulando o progresso (você deve substituir isso com a lógica real de scraping)
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        setLog((prevLog) => prevLog + `Progresso: ${i}%\n`); // Atualiza o log
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simula o tempo de scraping
      }

    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      setLog((prevLog) => prevLog + "Erro ao buscar pedidos.\n");
    } finally {
      setLoading(false);
      setShowModal(false); // Fecha o modal quando terminar
    }
  };

  // Função para visualizar os detalhes de um pedido
  const visualizarDetalhes = async (pedidoId: any) => {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (pedido) {
      setPedidoDetalhes(pedido);
    }
  };

  return (
    <div className="flex px-40 items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="w-full max-w-md">
        <button
          onClick={ativarScript}
          className="btn btn-primary mb-6"
          disabled={loading}
        >
          {loading ? 'Carregando...' : 'Ativar Script'}
        </button>
        <h2 className="text-2xl mb-4">Lista de Pedidos</h2>
        <ul className="space-y-4">
          {pedidos.length === 0 ? (
            <li>Nenhum pedido encontrado</li>
          ) : (
            pedidos.map((pedido) => (
              <li key={pedido.id} className="border p-4 rounded shadow">
                <div><strong>Pedido #{pedido.id}</strong></div>
                <div><em>{pedido.cliente}</em></div>
                <button
                  onClick={() => visualizarDetalhes(pedido.id)}
                  className="btn btn-secondary mt-2"
                >
                  Visualizar Detalhes
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {pedidoDetalhes && (
        <div className="w-full max-w-md mt-6">
          <h3 className="text-xl mb-4">Detalhes do Pedido #{pedidoDetalhes.id}</h3>
          <div><strong>Cliente:</strong> {pedidoDetalhes.cliente}</div>
          <div><strong>Data e Hora:</strong> {pedidoDetalhes.dataHora}</div>
          <div><strong>Status:</strong> {pedidoDetalhes.status}</div>
          <div><strong>Detalhes:</strong> {pedidoDetalhes.detalhes}</div>
        </div>
      )}

      {/* Modal de Progresso */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-8 rounded-lg w-96">
            <h3 className="text-2xl mb-4">Progresso do Scraping</h3>
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-center mt-2">{progress}%</div>
            </div>
            <div className="max-h-48 overflow-y-auto text-sm bg-gray-100 p-4 rounded">
              <pre>{log}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
