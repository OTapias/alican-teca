import type { GetServerSideProps } from 'next';

export default function OrderTest() {
  // ...tu componente tal cual... 
  return (
    <main style={{ padding: 16 }}>
      <h1>Probar creación de orden</h1>
      <button
        onClick={async () => {
          const res = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ id: '2', qty: 1 }], amount: 120000, currency: 'COP' })
          });
          const data = await res.json();
          console.log(data);
          alert(JSON.stringify(data, null, 2));
        }}
      >
        Crear orden de prueba
      </button>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};
