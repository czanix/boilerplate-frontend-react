# Czanix Boilerplate — Frontend React

> React 19 com TypeScript, Server Components e Zustand. Performance de verdade, não de benchmark.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-007ACC?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tech Reference](https://img.shields.io/badge/Czanix-Tech%20Reference-gold)](https://czanix.com/pt/stack)

**Precisa de SSR/SSG e SEO?** Use o [boilerplate-frontend-nextjs](https://github.com/czanix/boilerplate-frontend-nextjs) em vez deste.

---

## Filosofia

React é uma biblioteca de UI, não um framework. Este boilerplate trata React como tal:

1. **Colocation de estado** — estado perto de quem usa, não em store global por padrão
2. **Custom hooks para lógica** — componentes renderizam, hooks pensam
3. **Zustand para estado global** — Redux é overhead para 95% dos casos
4. **React Query para server state** — cache, revalidation, optimistic updates, retry
5. **Suspense boundaries** — loading states declarativos, não `isLoading` em todo componente

**O que não tem aqui:** Redux (Zustand faz o mesmo com 10x menos boilerplate), CSS-in-JS em runtime (performance penalty), `useEffect` para data fetching (React Query resolve melhor), `any` no TypeScript.

---

## Estrutura

```
src/
├── features/                        # Domínios isolados
│   ├── orders/
│   │   ├── components/
│   │   │   ├── OrderList.tsx
│   │   │   ├── OrderForm.tsx
│   │   │   └── OrderCard.tsx
│   │   ├── hooks/
│   │   │   ├── useOrders.ts         # React Query hook
│   │   │   └── useCreateOrder.ts    # Mutation hook
│   │   ├── services/
│   │   │   └── orders.api.ts        # HTTP layer pura
│   │   ├── types/
│   │   │   └── order.types.ts
│   │   └── OrdersPage.tsx
│   │
│   └── auth/
│       ├── components/
│       ├── hooks/
│       │   └── useAuth.ts
│       ├── stores/
│       │   └── auth.store.ts        # Zustand — só auth global
│       └── LoginPage.tsx
│
├── shared/
│   ├── components/
│   │   ├── Button.tsx               # Variants com cva()
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   └── ErrorBoundary.tsx        # Catch render errors
│   ├── hooks/
│   │   ├── useApi.ts                # Fetch wrapper Result<T>
│   │   ├── useDebounce.ts
│   │   └── useMediaQuery.ts
│   ├── utils/
│   │   ├── result.ts
│   │   └── cn.ts                    # clsx + tailwind-merge
│   └── layouts/
│       ├── RootLayout.tsx
│       └── AuthLayout.tsx
│
├── providers/
│   ├── QueryProvider.tsx            # React Query config
│   ├── RouterProvider.tsx
│   └── ThemeProvider.tsx
│
├── styles/
│   ├── tokens.css
│   └── globals.css
│
├── App.tsx
└── main.tsx
```

---

## Início rápido

```bash
# 1. Clone
git clone https://github.com/czanix/boilerplate-frontend-react.git meu-projeto
cd meu-projeto

# 2. Dependências
npm install

# 3. Ambiente
cp .env.example .env.local

# 4. Dev server
npm run dev
```

---

## React Query — server state resolvido

```typescript
// hooks/useOrders.ts — cache, revalidation, loading, error — tudo resolvido
export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => ordersApi.list(filters),
    staleTime: 30_000,          // 30s antes de revalidar
    placeholderData: keepPreviousData,  // UX suave em paginação
  });
}

// hooks/useCreateOrder.ts — mutation com optimistic update
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
```

```tsx
// OrdersPage.tsx — componente limpo
export default function OrdersPage() {
  const { data: orders, isLoading, error } = useOrders();
  const createOrder = useCreateOrder();

  if (error) return <ErrorState error={error} />;

  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrderList orders={orders} />
      <OrderForm
        onSubmit={(data) => createOrder.mutate(data)}
        isPending={createOrder.isPending}
      />
    </Suspense>
  );
}
```

**Por que não `useEffect` + `useState` para fetch?** Race conditions, memory leaks, sem cache, sem retry, sem deduplication. React Query resolve tudo com 3 linhas.

---

## Zustand — estado global mínimo

```typescript
// auth.store.ts — só o que é genuinamente global
interface AuthState {
  user: User | null;
  token: string | null;
  login: (credentials: LoginInput) => Promise<Result<User>>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),

  login: async (credentials) => {
    const result = await authApi.login(credentials);

    if (result.ok) {
      localStorage.setItem('token', result.value.token);
      set({ user: result.value.user, token: result.value.token });
    }

    return result;
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  isAuthenticated: () => get().token !== null,
}));
```

**Regra:** Se o dado vem do servidor, usa React Query. Se é estado de UI (modal aberto, tema, sidebar), usa `useState` local. Zustand é só para o que sobra: auth, preferências persistidas, estado cross-feature.

---

## Component Patterns

### Compound Components
```tsx
// Composição flexível sem prop drilling
<Table data={orders}>
  <Table.Header>
    <Table.Column field="customerName">Cliente</Table.Column>
    <Table.Column field="total" align="right">Total</Table.Column>
    <Table.Column field="status">Status</Table.Column>
  </Table.Header>
  <Table.Body renderRow={(order) => (
    <Table.Row key={order.publicId} onClick={() => select(order)}>
      <Table.Cell>{order.customerName}</Table.Cell>
      <Table.Cell align="right">{formatCurrency(order.total)}</Table.Cell>
      <Table.Cell><StatusBadge status={order.status} /></Table.Cell>
    </Table.Row>
  )} />
</Table>
```

### Error Boundaries
```tsx
// ErrorBoundary.tsx — captura erros de render sem crashar a app
<ErrorBoundary fallback={<ErrorState />}>
  <Suspense fallback={<Skeleton />}>
    <OrdersPage />
  </Suspense>
</ErrorBoundary>
```

---

## Performance

```tsx
// Lazy loading de rotas
const OrdersPage = lazy(() => import('@/features/orders/OrdersPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));

// Memoização cirúrgica — não em tudo
const ExpensiveChart = memo(function ExpensiveChart({ data }: Props) {
  const processed = useMemo(() => processData(data), [data]);
  return <Chart data={processed} />;
});

// useCallback só quando passa para componente memo
const handleSubmit = useCallback((data: OrderInput) => {
  createOrder.mutate(data);
}, [createOrder]);
```

**Regra:** `memo`, `useMemo` e `useCallback` são otimizações, não defaults. Perfil primeiro, otimize depois. React DevTools Profiler mostra onde está o gargalo real.

---

## Testes

```bash
npm run test               # Vitest — unit + integration
npm run test:e2e           # Playwright
npm run test:coverage      # Coverage report
```

```typescript
// Teste de hook com React Testing Library
describe('useOrders', () => {
  it('returns orders from API', async () => {
    server.use(
      http.get('/api/orders', () => HttpResponse.json(mockOrders))
    );

    const { result } = renderHook(() => useOrders());

    await waitFor(() => expect(result.current.data).toHaveLength(3));
  });
});
```

---

## Referência técnica

- [Guia de Frontend](https://czanix.com/pt/stack/backend)
- [Catálogo de Trade-offs](https://czanix.com/pt/stack/tradeoffs)
- [Tech Radar](https://czanix.com/pt/stack/tech-radar)

---

## Licença

MIT — use, adapte, melhore. Se ajudou, [deixa uma estrela](https://github.com/czanix/boilerplate-frontend-react) ⭐

---

<div align="center">
<sub>Desenvolvido e mantido por <a href="https://czanix.com">Cesar Zanis</a> — Czanix</sub>
</div>
