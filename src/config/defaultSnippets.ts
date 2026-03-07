import type { Snippet } from '../types';

export const defaultSnippets: Snippet[] = [
  // 1. CP TEMPLATE
  {
    prefix: 'cptemp',
    description: 'Complete CP Template with timestamp',
    isTemplate: true,
    body: `/**
*file modified on: \${1:TIMESTAMP}
**/

#include <bits/stdc++.h>
using namespace std;

#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace __gnu_pbds;

template<class T>
using Tree = tree<T, null_type, less<T>, rb_tree_tag,
    tree_order_statistics_node_update>;
/*|  *tree.find_by_order() ,tree.order_of_key()  |*/

//Alias
using ll = long long;
#define int long long

void fst() {
    ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    // cout << fixed << setprecision(10);
}
constexpr long long mod = 1e9+7;
constexpr long long inf = 1e18;

constexpr char nl = '\\n';
constexpr const char* gg = " ";

template<class C, class T> inline void pb(C& c, T&& x){ c.emplace_back(std::forward<T>(x)); }
template<class K, class V> using umap = unordered_map<K, V>;
template<class C> constexpr inline int sz(const C& x){ return (int)x.size(); }
#define all(a) a.begin(),a.end()
#define trav(i, a) for (auto& i : a)
template<class C> inline void vin(C& a){ for(auto& i:a) cin>>i; }
constexpr inline ll gcd(ll a,ll b){return b?gcd(b,a%b):a;}
constexpr inline ll lcm(ll a,ll b){return a/gcd(a,b)*b;}
constexpr inline ll power(ll a,ll b){ ll r=1; while(b){ if(b&1) r*=a; a*=a; b>>=1; } return r;}
constexpr inline ll modpower(ll a,ll b,ll mod){ll r=1%mod; a%=mod; while(b){ if(b&1) r=((r*a)%mod); a=((a*a)%mod); b>>=1;} return r;}
#define say(cond) do{ cout << ((cond)?"YES\\n":"NO\\n"); return; }while(0)
template<class C> inline void unq(C& a){ a.erase(unique(a.begin(), a.end()), a.end()); }
template<class C, class T> inline void em(C& c, T&& x){ c.emplace_back(std::forward<T>(x)); }
template<class C> inline void rg(C& a,int m,bool d=false){ while(m--){int u,v;cin>>u>>v;--u;--v; em(a[u],v); if(!d)em(a[v],u);}}


//----------------------------------------------------------------------------

void meoww() {
    $0
    
    
}

int32_t main() {
    fst();
    
    
    int t=1;
    cin>>t;
    for(int i=1;i<=t;i++) {
        // cout << "Case #" << i << ": " << nl;
        meoww();
    }
    
    
    return 0;
}`
  },
  // 2. FAST IO
  {
    prefix: 'fastio',
    description: 'Fast I/O setup',
    body: 'ios_base::sync_with_stdio(false); cin.tie(NULL);'
  },
  // 3. READ ARRAY
  {
    prefix: 'readarr',
    description: 'Read array from input',
    body: 'int \${1:n}; cin >> \${1:n}; vector<int> \${2:a}(\${1:n}); for(auto& x : \${2:a}) cin >> x;'
  },
  // 4. PRINT ARRAY
  {
    prefix: 'printarr',
    description: 'Print array with space/newline',
    body: 'for(int i = 0; i < \${1:n}; i++) cout << \${2:a}[i] << " \\\\n"[i==\${1:n}-1];'
  },
  // 5. YES NO
  {
    prefix: 'yn',
    description: 'Print YES or NO',
    body: 'cout << (\${1:condition} ? "YES" : "NO") << "\\n";'
  },
  // 6. DEBUG
  {
    prefix: 'dbg',
    description: 'Debug macro (only active with LOCAL)',
    body: `#ifdef LOCAL
#define debug(x) cerr << #x << " = " << (x) << endl
#else
#define debug(x)
#endif`
  },
  // 7. FOR I
  {
    prefix: 'fori',
    description: 'For loop (0 to n)',
    body: 'for(int \${1:i} = 0; \${1:i} < \${2:n}; \${1:i}++) {\n\t$0\n}'
  },
  // 8. FOR REVERSE
  {
    prefix: 'forr',
    description: 'For loop reverse (n-1 to 0)',
    body: 'for(int \${1:i} = \${2:n}-1; \${1:i} >= 0; \${1:i}--) {\n\t$0\n}'
  },
  // 9. FOR EACH
  {
    prefix: 'fore',
    description: 'Range-based for loop',
    body: 'for(auto& \${1:e} : \${2:container}) {\n\t$0\n}'
  },
  // 10. WHILE
  {
    prefix: 'whl',
    description: 'While loop',
    body: 'while(\${1:condition}) {\n\t$0\n}'
  },
  // 11. SEGMENT TREE
  {
    prefix: 'segtree',
    description: 'Segment Tree (point update, range query)',
    body: `struct SegTree {
    int n;
    vector<long long> tree;
    SegTree(int _n) : n(_n), tree(4 * _n, 0) {}
    void build(vector<long long>& a, int node, int start, int end) {
        if(start == end) { tree[node] = a[start]; return; }
        int mid = (start + end) / 2;
        build(a, 2*node, start, mid);
        build(a, 2*node+1, mid+1, end);
        tree[node] = tree[2*node] + tree[2*node+1];
    }
    void build(vector<long long>& a) { build(a, 1, 0, n-1); }
    void update(int node, int start, int end, int idx, long long val) {
        if(start == end) { tree[node] = val; return; }
        int mid = (start + end) / 2;
        if(idx <= mid) update(2*node, start, mid, idx, val);
        else update(2*node+1, mid+1, end, idx, val);
        tree[node] = tree[2*node] + tree[2*node+1];
    }
    void update(int idx, long long val) { update(1, 0, n-1, idx, val); }
    long long query(int node, int start, int end, int l, int r) {
        if(r < start || end < l) return 0;
        if(l <= start && end <= r) return tree[node];
        int mid = (start + end) / 2;
        return query(2*node, start, mid, l, r) + query(2*node+1, mid+1, end, l, r);
    }
    long long query(int l, int r) { return query(1, 0, n-1, l, r); }
};
$0`
  },
  // 12. LAZY SEGMENT TREE
  {
    prefix: 'lazysegtree',
    description: 'Segment Tree with Lazy Propagation',
    body: `struct LazySegTree {
    int n;
    vector<long long> tree, lazy;
    LazySegTree(int _n) : n(_n), tree(4*_n, 0), lazy(4*_n, 0) {}
    void push_down(int node) {
        if(lazy[node] != 0) {
            tree[2*node] += lazy[node];
            tree[2*node+1] += lazy[node];
            lazy[2*node] += lazy[node];
            lazy[2*node+1] += lazy[node];
            lazy[node] = 0;
        }
    }
    void build(vector<long long>& a, int node, int start, int end) {
        if(start == end) { tree[node] = a[start]; return; }
        int mid = (start + end) / 2;
        build(a, 2*node, start, mid);
        build(a, 2*node+1, mid+1, end);
        tree[node] = tree[2*node] + tree[2*node+1];
    }
    void build(vector<long long>& a) { build(a, 1, 0, n-1); }
    void update(int node, int start, int end, int l, int r, long long val) {
        if(r < start || end < l) return;
        if(l <= start && end <= r) {
            tree[node] += val * (end - start + 1);
            lazy[node] += val;
            return;
        }
        push_down(node);
        int mid = (start + end) / 2;
        update(2*node, start, mid, l, r, val);
        update(2*node+1, mid+1, end, l, r, val);
        tree[node] = tree[2*node] + tree[2*node+1];
    }
    void update(int l, int r, long long val) { update(1, 0, n-1, l, r, val); }
    long long query(int node, int start, int end, int l, int r) {
        if(r < start || end < l) return 0;
        if(l <= start && end <= r) return tree[node];
        push_down(node);
        int mid = (start + end) / 2;
        return query(2*node, start, mid, l, r) + query(2*node+1, mid+1, end, l, r);
    }
    long long query(int l, int r) { return query(1, 0, n-1, l, r); }
};
$0`
  },
  // 13. BIT / FENWICK TREE
  {
    prefix: 'bit',
    description: 'Binary Indexed Tree (Fenwick Tree)',
    body: `struct BIT {
    int n;
    vector<long long> tree;
    BIT(int _n) : n(_n), tree(_n + 1, 0) {}
    void update(int i, long long delta) {
        for(++i; i <= n; i += i & (-i))
            tree[i] += delta;
    }
    long long query(int i) {
        long long sum = 0;
        for(++i; i > 0; i -= i & (-i))
            sum += tree[i];
        return sum;
    }
    long long query(int l, int r) {
        return query(r) - (l > 0 ? query(l - 1) : 0);
    }
};
$0`
  },
  // 14. DSU
  {
    prefix: 'dsu',
    description: 'Disjoint Set Union (Union-Find)',
    body: `struct DSU {
    vector<int> parent, rank_;
    int components;
    DSU(int n) : parent(n), rank_(n, 0), components(n) {
        iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        if(parent[x] != x) parent[x] = find(parent[x]);
        return parent[x];
    }
    bool unite(int x, int y) {
        x = find(x); y = find(y);
        if(x == y) return false;
        if(rank_[x] < rank_[y]) swap(x, y);
        parent[y] = x;
        if(rank_[x] == rank_[y]) rank_[x]++;
        components--;
        return true;
    }
    bool connected(int x, int y) { return find(x) == find(y); }
};
$0`
  },
  // 15. SPARSE TABLE
  {
    prefix: 'sparse',
    description: 'Sparse Table for Range Minimum Query',
    body: `struct SparseTable {
    vector<vector<int>> table;
    vector<int> lg;
    int n;
    SparseTable(vector<int>& a) : n(a.size()), lg(a.size() + 1) {
        for(int i = 2; i <= n; i++) lg[i] = lg[i/2] + 1;
        int k = lg[n] + 1;
        table.assign(k, vector<int>(n));
        table[0] = a;
        for(int j = 1; j < k; j++)
            for(int i = 0; i + (1 << j) <= n; i++)
                table[j][i] = min(table[j-1][i], table[j-1][i + (1 << (j-1))]);
    }
    int query(int l, int r) {
        int k = lg[r - l + 1];
        return min(table[k][l], table[k][r - (1 << k) + 1]);
    }
};
$0`
  },
  // 16. TRIE
  {
    prefix: 'trie',
    description: 'Trie implementation',
    body: `struct Trie {
    struct Node {
        int children[26];
        int cnt;
        bool is_end;
        Node() : cnt(0), is_end(false) { memset(children, -1, sizeof(children)); }
    };
    vector<Node> nodes;
    Trie() { nodes.emplace_back(); }
    void insert(const string& s) {
        int cur = 0;
        for(char c : s) {
            int idx = c - 'a';
            if(nodes[cur].children[idx] == -1) {
                nodes[cur].children[idx] = nodes.size();
                nodes.emplace_back();
            }
            cur = nodes[cur].children[idx];
            nodes[cur].cnt++;
        }
        nodes[cur].is_end = true;
    }
    bool search(const string& s) {
        int cur = 0;
        for(char c : s) {
            int idx = c - 'a';
            if(nodes[cur].children[idx] == -1) return false;
            cur = nodes[cur].children[idx];
        }
        return nodes[cur].is_end;
    }
    int prefix_count(const string& s) {
        int cur = 0;
        for(char c : s) {
            int idx = c - 'a';
            if(nodes[cur].children[idx] == -1) return 0;
            cur = nodes[cur].children[idx];
        }
        return nodes[cur].cnt;
    }
};
$0`
  },
  // 17. PBDS
  {
    prefix: 'pbds',
    description: 'Policy-based ordered set (PBDS)',
    body: `#include <ext/pb_ds/assoc_container.hpp>
#include <ext/pb_ds/tree_policy.hpp>
using namespace __gnu_pbds;
template<class T>
using ordered_set = tree<T, null_type, less<T>, rb_tree_tag,
    tree_order_statistics_node_update>;
// ordered_set<int> s;
// s.find_by_order(k) -> iterator to k-th element (0-indexed)
// s.order_of_key(x) -> number of elements strictly less than x
$0`
  },
  // 18. MIN STACK
  {
    prefix: 'minstack',
    description: 'Stack with minimum query',
    body: `struct MinStack {
    stack<pair<long long, long long>> st;
    void push(long long x) {
        long long mn = st.empty() ? x : min(x, st.top().second);
        st.push({x, mn});
    }
    void pop() { st.pop(); }
    long long top() { return st.top().first; }
    long long getMin() { return st.top().second; }
    bool empty() { return st.empty(); }
    int size() { return st.size(); }
};
$0`
  },
  // 19. MONOTONE DEQUE
  {
    prefix: 'monotoneq',
    description: 'Monotone deque for sliding window min/max',
    body: `// Sliding window minimum using monotone deque
// Usage: for each element, call add(val), when window exceeds k, call remove(old_val)
struct MonoDeque {
    deque<pair<int,int>> dq; // {value, index}
    int idx = 0;
    void add(int val) {
        while(!dq.empty() && dq.back().first >= val) dq.pop_back();
        dq.push_back({val, idx++});
    }
    void remove_before(int i) {
        while(!dq.empty() && dq.front().second < i) dq.pop_front();
    }
    int getMin() { return dq.front().first; }
};
$0`
  },
  // 20. ADJ LIST
  {
    prefix: 'adjlist',
    description: 'Adjacency list + edge reading',
    body: `int \${1:n}, \${2:m};
cin >> \${1:n} >> \${2:m};
vector<vector<int>> adj(\${1:n});
for(int i = 0; i < \${2:m}; i++) {
    int u, v; cin >> u >> v; --u; --v;
    adj[u].push_back(v);
    adj[v].push_back(u);
}
$0`
  },
  // 21. WEIGHTED ADJ LIST
  {
    prefix: 'wadjlist',
    description: 'Weighted adjacency list + edge reading',
    body: `int \${1:n}, \${2:m};
cin >> \${1:n} >> \${2:m};
vector<vector<pair<int,long long>>> adj(\${1:n});
for(int i = 0; i < \${2:m}; i++) {
    int u, v; long long w; cin >> u >> v >> w; --u; --v;
    adj[u].push_back({v, w});
    adj[v].push_back({u, w});
}
$0`
  },
  // 22. DFS
  {
    prefix: 'dfs',
    description: 'DFS template',
    body: `vector<bool> visited;
void dfs(int u, vector<vector<int>>& adj) {
    visited[u] = true;
    for(int v : adj[u]) {
        if(!visited[v]) {
            dfs(v, adj);
        }
    }
}
// Usage: visited.assign(n, false); dfs(0, adj);
$0`
  },
  // 23. BFS
  {
    prefix: 'bfs',
    description: 'BFS template',
    body: `vector<int> bfs(int src, vector<vector<int>>& adj, int n) {
    vector<int> dist(n, -1);
    queue<int> q;
    dist[src] = 0;
    q.push(src);
    while(!q.empty()) {
        int u = q.front(); q.pop();
        for(int v : adj[u]) {
            if(dist[v] == -1) {
                dist[v] = dist[u] + 1;
                q.push(v);
            }
        }
    }
    return dist;
}
$0`
  },
  // 24. DIJKSTRA
  {
    prefix: 'dijkstra',
    description: "Dijkstra's shortest path",
    body: `vector<long long> dijkstra(int src, vector<vector<pair<int,long long>>>& adj, int n) {
    vector<long long> dist(n, 1e18);
    priority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;
    dist[src] = 0;
    pq.push({0, src});
    while(!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if(d > dist[u]) continue;
        for(auto [v, w] : adj[u]) {
            if(dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}
$0`
  },
  // 25. BELLMAN FORD
  {
    prefix: 'bellman',
    description: 'Bellman-Ford shortest path',
    body: `struct Edge { int u, v; long long w; };
vector<long long> bellman_ford(int src, vector<Edge>& edges, int n) {
    vector<long long> dist(n, 1e18);
    dist[src] = 0;
    for(int i = 0; i < n - 1; i++) {
        for(auto& [u, v, w] : edges) {
            if(dist[u] < 1e18 && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
            }
        }
    }
    // Check negative cycle
    for(auto& [u, v, w] : edges) {
        if(dist[u] < 1e18 && dist[u] + w < dist[v]) {
            // Negative cycle exists
        }
    }
    return dist;
}
$0`
  },
  // 26. FLOYD
  {
    prefix: 'floyd',
    description: 'Floyd-Warshall all-pairs shortest paths',
    body: `// dist[i][j] initialized to edge weight or INF
void floyd(vector<vector<long long>>& dist, int n) {
    for(int k = 0; k < n; k++)
        for(int i = 0; i < n; i++)
            for(int j = 0; j < n; j++)
                if(dist[i][k] < 1e18 && dist[k][j] < 1e18)
                    dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]);
}
$0`
  },
  // 27. TOPOSORT
  {
    prefix: 'toposort',
    description: "Topological sort (Kahn's BFS)",
    body: `vector<int> toposort(vector<vector<int>>& adj, int n) {
    vector<int> in_deg(n, 0);
    for(int u = 0; u < n; u++)
        for(int v : adj[u]) in_deg[v]++;
    queue<int> q;
    for(int i = 0; i < n; i++)
        if(in_deg[i] == 0) q.push(i);
    vector<int> order;
    while(!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for(int v : adj[u]) {
            if(--in_deg[v] == 0) q.push(v);
        }
    }
    return order; // if order.size() != n, cycle exists
}
$0`
  },
  // 28. KRUSKAL
  {
    prefix: 'kruskal',
    description: "Kruskal's MST",
    body: `struct KruskalEdge { int u, v; long long w; };
long long kruskal(vector<KruskalEdge>& edges, int n) {
    sort(edges.begin(), edges.end(), [](auto& a, auto& b){ return a.w < b.w; });
    vector<int> parent(n); iota(parent.begin(), parent.end(), 0);
    vector<int> rank_(n, 0);
    function<int(int)> find = [&](int x) {
        return parent[x] == x ? x : parent[x] = find(parent[x]);
    };
    long long mst = 0;
    int cnt = 0;
    for(auto& [u, v, w] : edges) {
        int pu = find(u), pv = find(v);
        if(pu != pv) {
            if(rank_[pu] < rank_[pv]) swap(pu, pv);
            parent[pv] = pu;
            if(rank_[pu] == rank_[pv]) rank_[pu]++;
            mst += w;
            if(++cnt == n - 1) break;
        }
    }
    return mst;
}
$0`
  },
  // 29. LCA
  {
    prefix: 'lca',
    description: 'LCA with binary lifting',
    body: `struct LCA {
    int n, LOG;
    vector<vector<int>> adj, up;
    vector<int> depth;
    LCA(int _n) : n(_n), adj(_n), depth(_n, 0) {
        LOG = __lg(n) + 1;
        up.assign(LOG, vector<int>(n, 0));
    }
    void add_edge(int u, int v) {
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    void build(int root = 0) {
        function<void(int, int)> dfs = [&](int u, int p) {
            up[0][u] = p;
            for(int i = 1; i < LOG; i++)
                up[i][u] = up[i-1][up[i-1][u]];
            for(int v : adj[u]) {
                if(v != p) {
                    depth[v] = depth[u] + 1;
                    dfs(v, u);
                }
            }
        };
        dfs(root, root);
    }
    int lca(int u, int v) {
        if(depth[u] < depth[v]) swap(u, v);
        int diff = depth[u] - depth[v];
        for(int i = 0; i < LOG; i++)
            if((diff >> i) & 1) u = up[i][u];
        if(u == v) return u;
        for(int i = LOG - 1; i >= 0; i--)
            if(up[i][u] != up[i][v]) { u = up[i][u]; v = up[i][v]; }
        return up[0][u];
    }
    int dist(int u, int v) {
        return depth[u] + depth[v] - 2 * depth[lca(u, v)];
    }
};
$0`
  },
  // 30. SCC (TARJAN)
  {
    prefix: 'scc',
    description: "Tarjan's Strongly Connected Components",
    body: `struct SCC {
    int n, timer = 0, nscc = 0;
    vector<vector<int>> adj;
    vector<int> order, comp, low, disc;
    vector<bool> on_stack;
    stack<int> st;
    SCC(int _n) : n(_n), adj(_n), comp(_n, -1), low(_n), disc(_n, -1), on_stack(_n, false) {}
    void add_edge(int u, int v) { adj[u].push_back(v); }
    void dfs(int u) {
        low[u] = disc[u] = timer++;
        st.push(u); on_stack[u] = true;
        for(int v : adj[u]) {
            if(disc[v] == -1) { dfs(v); low[u] = min(low[u], low[v]); }
            else if(on_stack[v]) low[u] = min(low[u], disc[v]);
        }
        if(low[u] == disc[u]) {
            while(true) {
                int v = st.top(); st.pop();
                on_stack[v] = false;
                comp[v] = nscc;
                if(v == u) break;
            }
            nscc++;
        }
    }
    void build() {
        for(int i = 0; i < n; i++)
            if(disc[i] == -1) dfs(i);
    }
};
$0`
  },
  // 31. BRIDGES
  {
    prefix: 'bridges',
    description: 'Bridge finding in undirected graph',
    body: `struct Bridges {
    int n, timer = 0;
    vector<vector<pair<int,int>>> adj; // {to, edge_id}
    vector<int> disc, low;
    vector<bool> is_bridge;
    Bridges(int _n, int m) : n(_n), adj(_n), disc(_n, -1), low(_n), is_bridge(m, false) {}
    void add_edge(int u, int v, int id) {
        adj[u].push_back({v, id});
        adj[v].push_back({u, id});
    }
    void dfs(int u, int pid) {
        disc[u] = low[u] = timer++;
        for(auto [v, id] : adj[u]) {
            if(id == pid) continue;
            if(disc[v] == -1) {
                dfs(v, id);
                low[u] = min(low[u], low[v]);
                if(low[v] > disc[u]) is_bridge[id] = true;
            } else {
                low[u] = min(low[u], disc[v]);
            }
        }
    }
    void build() {
        for(int i = 0; i < n; i++)
            if(disc[i] == -1) dfs(i, -1);
    }
};
$0`
  },
  // 32. MAX FLOW (DINIC)
  {
    prefix: 'maxflow',
    description: "Dinic's maximum flow",
    body: `struct MaxFlow {
    struct Edge { int to, rev; long long cap; };
    int n;
    vector<vector<Edge>> graph;
    vector<int> level, iter;
    MaxFlow(int _n) : n(_n), graph(_n), level(_n), iter(_n) {}
    void add_edge(int from, int to, long long cap) {
        graph[from].push_back({to, (int)graph[to].size(), cap});
        graph[to].push_back({from, (int)graph[from].size()-1, 0});
    }
    bool bfs(int s, int t) {
        fill(level.begin(), level.end(), -1);
        queue<int> q;
        level[s] = 0; q.push(s);
        while(!q.empty()) {
            int v = q.front(); q.pop();
            for(auto& e : graph[v]) {
                if(e.cap > 0 && level[e.to] < 0) {
                    level[e.to] = level[v] + 1;
                    q.push(e.to);
                }
            }
        }
        return level[t] >= 0;
    }
    long long dfs(int v, int t, long long f) {
        if(v == t) return f;
        for(int& i = iter[v]; i < (int)graph[v].size(); i++) {
            Edge& e = graph[v][i];
            if(e.cap > 0 && level[v] < level[e.to]) {
                long long d = dfs(e.to, t, min(f, e.cap));
                if(d > 0) { e.cap -= d; graph[e.to][e.rev].cap += d; return d; }
            }
        }
        return 0;
    }
    long long max_flow(int s, int t) {
        long long flow = 0;
        while(bfs(s, t)) {
            fill(iter.begin(), iter.end(), 0);
            long long d;
            while((d = dfs(s, t, 1e18)) > 0) flow += d;
        }
        return flow;
    }
};
$0`
  },
  // 33. BIPARTITE MATCHING
  {
    prefix: 'bipartite',
    description: 'Hopcroft-Karp bipartite matching',
    body: `struct HopcroftKarp {
    int n, m;
    vector<vector<int>> adj;
    vector<int> match_l, match_r, dist;
    HopcroftKarp(int _n, int _m) : n(_n), m(_m), adj(_n), match_l(_n, -1), match_r(_m, -1), dist(_n) {}
    void add_edge(int u, int v) { adj[u].push_back(v); }
    bool bfs() {
        queue<int> q;
        for(int u = 0; u < n; u++) {
            if(match_l[u] == -1) { dist[u] = 0; q.push(u); }
            else dist[u] = 1e9;
        }
        bool found = false;
        while(!q.empty()) {
            int u = q.front(); q.pop();
            for(int v : adj[u]) {
                int w = match_r[v];
                if(w == -1) found = true;
                else if(dist[w] > dist[u] + 1) {
                    dist[w] = dist[u] + 1;
                    q.push(w);
                }
            }
        }
        return found;
    }
    bool dfs(int u) {
        for(int v : adj[u]) {
            int w = match_r[v];
            if(w == -1 || (dist[w] == dist[u] + 1 && dfs(w))) {
                match_l[u] = v; match_r[v] = u; return true;
            }
        }
        dist[u] = 1e9;
        return false;
    }
    int max_matching() {
        int ans = 0;
        while(bfs())
            for(int u = 0; u < n; u++)
                if(match_l[u] == -1 && dfs(u)) ans++;
        return ans;
    }
};
$0`
  },
  // 34. MOD POW
  {
    prefix: 'modpow',
    description: 'Modular exponentiation',
    body: `long long modpow(long long base, long long exp, long long mod) {
    long long result = 1 % mod;
    base %= mod;
    while(exp > 0) {
        if(exp & 1) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}
$0`
  },
  // 35. MOD INV
  {
    prefix: 'modinv',
    description: "Modular inverse via Fermat's little theorem",
    body: `long long modinv(long long a, long long mod) {
    return modpow(a, mod - 2, mod);
}
$0`
  },
  // 36. SIEVE
  {
    prefix: 'sieve',
    description: 'Sieve of Eratosthenes',
    body: `vector<bool> sieve(int n) {
    vector<bool> is_prime(n + 1, true);
    is_prime[0] = is_prime[1] = false;
    for(int i = 2; i * i <= n; i++)
        if(is_prime[i])
            for(int j = i * i; j <= n; j += i)
                is_prime[j] = false;
    return is_prime;
}
// Usage: auto primes = sieve(1e6);
$0`
  },
  // 37. NCR
  {
    prefix: 'ncr',
    description: 'nCr with precomputed factorials',
    body: `const int MAXN = 2e5 + 5;
const long long MOD = 1e9 + 7;
long long fact_[MAXN], inv_fact[MAXN];
void precompute() {
    fact_[0] = 1;
    for(int i = 1; i < MAXN; i++) fact_[i] = fact_[i-1] * i % MOD;
    inv_fact[MAXN-1] = modpow(fact_[MAXN-1], MOD-2, MOD);
    for(int i = MAXN-2; i >= 0; i--) inv_fact[i] = inv_fact[i+1] * (i+1) % MOD;
}
long long nCr(int n, int r) {
    if(r < 0 || r > n) return 0;
    return fact_[n] % MOD * inv_fact[r] % MOD * inv_fact[n-r] % MOD;
}
$0`
  },
  // 38. EXTENDED GCD
  {
    prefix: 'extgcd',
    description: 'Extended Euclidean Algorithm',
    body: `long long extgcd(long long a, long long b, long long &x, long long &y) {
    if(b == 0) { x = 1; y = 0; return a; }
    long long x1, y1;
    long long g = extgcd(b, a % b, x1, y1);
    x = y1;
    y = x1 - (a / b) * y1;
    return g;
}
$0`
  },
  // 39. MATRIX MULTIPLY
  {
    prefix: 'matmul',
    description: 'Matrix multiplication + exponentiation',
    body: `using Matrix = vector<vector<long long>>;
const long long MMOD = 1e9 + 7;
Matrix mat_mul(const Matrix& A, const Matrix& B) {
    int n = A.size(), m = B[0].size(), k = B.size();
    Matrix C(n, vector<long long>(m, 0));
    for(int i = 0; i < n; i++)
        for(int j = 0; j < m; j++)
            for(int p = 0; p < k; p++)
                C[i][j] = (C[i][j] + A[i][p] * B[p][j]) % MMOD;
    return C;
}
Matrix mat_pow(Matrix A, long long p) {
    int n = A.size();
    Matrix result(n, vector<long long>(n, 0));
    for(int i = 0; i < n; i++) result[i][i] = 1;
    while(p > 0) {
        if(p & 1) result = mat_mul(result, A);
        A = mat_mul(A, A);
        p >>= 1;
    }
    return result;
}
$0`
  },
  // 40. CRT
  {
    prefix: 'crt',
    description: 'Chinese Remainder Theorem',
    body: `// Returns {x, lcm} such that x % m_i = r_i for all i
// Returns {-1, -1} if no solution
pair<long long, long long> crt(long long r1, long long m1, long long r2, long long m2) {
    long long g = __gcd(m1, m2);
    if((r2 - r1) % g != 0) return {-1, -1};
    long long lcm = m1 / g * m2;
    long long x, y;
    extgcd(m1/g, m2/g, x, y);
    long long diff = (r2 - r1) / g;
    long long mod = m2 / g;
    x = (x % mod * (diff % mod) + mod) % mod;
    return {r1 + m1 * x, lcm};
}
$0`
  },
  // 41. MILLER RABIN
  {
    prefix: 'miller',
    description: 'Miller-Rabin primality test',
    body: `long long mulmod(long long a, long long b, long long m) {
    return (__int128)a * b % m;
}
long long powmod(long long a, long long b, long long m) {
    long long res = 1; a %= m;
    while(b > 0) {
        if(b & 1) res = mulmod(res, a, m);
        a = mulmod(a, a, m);
        b >>= 1;
    }
    return res;
}
bool miller_rabin(long long n) {
    if(n < 2) return false;
    if(n == 2 || n == 3) return true;
    if(n % 2 == 0) return false;
    long long d = n - 1; int r = 0;
    while(d % 2 == 0) { d /= 2; r++; }
    for(long long a : {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37}) {
        if(a >= n) continue;
        long long x = powmod(a, d, n);
        if(x == 1 || x == n - 1) continue;
        bool found = false;
        for(int i = 0; i < r - 1; i++) {
            x = mulmod(x, x, n);
            if(x == n - 1) { found = true; break; }
        }
        if(!found) return false;
    }
    return true;
}
$0`
  },
  // 42. KMP
  {
    prefix: 'kmp',
    description: 'KMP pattern matching',
    body: `vector<int> kmp_table(const string& pattern) {
    int m = pattern.size();
    vector<int> lps(m, 0);
    int len = 0, i = 1;
    while(i < m) {
        if(pattern[i] == pattern[len]) { lps[i++] = ++len; }
        else if(len) { len = lps[len - 1]; }
        else { lps[i++] = 0; }
    }
    return lps;
}
vector<int> kmp_search(const string& text, const string& pattern) {
    vector<int> result;
    vector<int> lps = kmp_table(pattern);
    int n = text.size(), m = pattern.size();
    int i = 0, j = 0;
    while(i < n) {
        if(text[i] == pattern[j]) { i++; j++; }
        if(j == m) { result.push_back(i - j); j = lps[j - 1]; }
        else if(i < n && text[i] != pattern[j]) {
            if(j) j = lps[j - 1];
            else i++;
        }
    }
    return result;
}
$0`
  },
  // 43. POLYNOMIAL HASHING
  {
    prefix: 'zhash',
    description: 'Polynomial string hashing',
    body: `struct StringHash {
    vector<long long> h, pw;
    long long base, mod;
    StringHash(const string& s, long long base = 131, long long mod = 1e9+7)
        : base(base), mod(mod), h(s.size()+1, 0), pw(s.size()+1, 1) {
        for(int i = 0; i < (int)s.size(); i++) {
            h[i+1] = (h[i] * base + s[i]) % mod;
            pw[i+1] = pw[i] * base % mod;
        }
    }
    long long get(int l, int r) { // [l, r) 0-indexed
        return (h[r] - h[l] * pw[r-l] % mod + mod * mod) % mod;
    }
};
$0`
  },
  // 44. Z FUNCTION
  {
    prefix: 'zfunc',
    description: 'Z-function algorithm',
    body: `vector<int> z_function(const string& s) {
    int n = s.size();
    vector<int> z(n, 0);
    int l = 0, r = 0;
    for(int i = 1; i < n; i++) {
        if(i < r) z[i] = min(r - i, z[i - l]);
        while(i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
        if(i + z[i] > r) { l = i; r = i + z[i]; }
    }
    return z;
}
$0`
  },
  // 45. MANACHER
  {
    prefix: 'manacher',
    description: "Manacher's palindrome algorithm",
    body: `vector<int> manacher_odd(const string& s) {
    int n = s.size();
    vector<int> d(n, 1);
    int l = 0, r = 0;
    for(int i = 1; i < n; i++) {
        if(i < r) d[i] = min(r - i, d[l + r - i]);
        while(i - d[i] >= 0 && i + d[i] < n && s[i - d[i]] == s[i + d[i]]) d[i]++;
        if(i + d[i] > r) { l = i - d[i] + 1; r = i + d[i]; }
    }
    return d;
}
// For even palindromes, insert '#' between chars: "abc" -> "#a#b#c#"
$0`
  },
  // 46. SUFFIX ARRAY
  {
    prefix: 'sufarray',
    description: 'Suffix Array + LCP Array',
    body: `struct SuffixArray {
    vector<int> sa, rank_, lcp;
    SuffixArray(const string& s) {
        int n = s.size();
        sa.resize(n); rank_.resize(n); lcp.resize(n, 0);
        iota(sa.begin(), sa.end(), 0);
        for(int i = 0; i < n; i++) rank_[i] = s[i];
        for(int k = 1; k < n; k <<= 1) {
            auto cmp = [&](int a, int b) {
                if(rank_[a] != rank_[b]) return rank_[a] < rank_[b];
                int ra = a + k < n ? rank_[a + k] : -1;
                int rb = b + k < n ? rank_[b + k] : -1;
                return ra < rb;
            };
            sort(sa.begin(), sa.end(), cmp);
            vector<int> tmp(n);
            tmp[sa[0]] = 0;
            for(int i = 1; i < n; i++)
                tmp[sa[i]] = tmp[sa[i-1]] + cmp(sa[i-1], sa[i]);
            rank_ = tmp;
        }
        // Build LCP using Kasai's algorithm
        vector<int> inv(n);
        for(int i = 0; i < n; i++) inv[sa[i]] = i;
        int k = 0;
        for(int i = 0; i < n; i++) {
            if(inv[i] == 0) { k = 0; continue; }
            int j = sa[inv[i] - 1];
            while(i + k < n && j + k < n && s[i+k] == s[j+k]) k++;
            lcp[inv[i]] = k;
            if(k) k--;
        }
    }
};
$0`
  },
  // 47. KNAPSACK
  {
    prefix: 'dpknapsack',
    description: '0/1 Knapsack DP',
    body: `// 0/1 Knapsack: n items, capacity W
int n, W;
cin >> n >> W;
vector<int> w(n), v(n);
for(int i = 0; i < n; i++) cin >> w[i] >> v[i];
vector<long long> dp(W + 1, 0);
for(int i = 0; i < n; i++)
    for(int j = W; j >= w[i]; j--)
        dp[j] = max(dp[j], dp[j - w[i]] + v[i]);
cout << dp[W] << "\\n";
$0`
  },
  // 48. LIS
  {
    prefix: 'dplis',
    description: 'Longest Increasing Subsequence O(n log n)',
    body: `int lis(vector<int>& a) {
    vector<int> dp;
    for(int x : a) {
        auto it = lower_bound(dp.begin(), dp.end(), x);
        if(it == dp.end()) dp.push_back(x);
        else *it = x;
    }
    return dp.size();
}
$0`
  },
  // 49. DIGIT DP
  {
    prefix: 'dpdigit',
    description: 'Digit DP template',
    body: `// Count numbers in [1, num] satisfying some property
long long digitDP(string num) {
    int n = num.size();
    // dp[pos][tight][state]
    vector<vector<vector<long long>>> dp(n, vector<vector<long long>>(2, vector<long long>(\${1:STATES}, -1)));
    
    function<long long(int, bool, int)> solve = [&](int pos, bool tight, int state) -> long long {
        if(pos == n) return \${2:/* base case */} 1;
        auto& res = dp[pos][tight][state];
        if(res != -1) return res;
        res = 0;
        int limit = tight ? num[pos] - '0' : 9;
        for(int d = 0; d <= limit; d++) {
            // Update state based on digit d
            int new_state = state; // modify as needed
            res += solve(pos + 1, tight && (d == limit), new_state);
        }
        return res;
    };
    return solve(0, true, 0);
}
$0`
  },
  // 50. BITMASK DP
  {
    prefix: 'dpmask',
    description: 'Bitmask DP template',
    body: `int n; cin >> n;
vector<vector<long long>> dp(1 << n, vector<long long>(n, 1e18));

// Base case: starting from each node
for(int i = 0; i < n; i++) dp[1 << i][i] = 0; // or initial cost

for(int mask = 1; mask < (1 << n); mask++) {
    for(int u = 0; u < n; u++) {
        if(!(mask & (1 << u))) continue;
        if(dp[mask][u] >= 1e18) continue;
        for(int v = 0; v < n; v++) {
            if(mask & (1 << v)) continue;
            int nmask = mask | (1 << v);
            long long cost = 0; // compute transition cost
            dp[nmask][v] = min(dp[nmask][v], dp[mask][u] + cost);
        }
    }
}
$0`
  },
  // 51. POINT 2D
  {
    prefix: 'point',
    description: '2D Point struct with operators',
    body: `struct Point {
    double x, y;
    Point(double x = 0, double y = 0) : x(x), y(y) {}
    Point operator+(const Point& p) const { return {x+p.x, y+p.y}; }
    Point operator-(const Point& p) const { return {x-p.x, y-p.y}; }
    Point operator*(double t) const { return {x*t, y*t}; }
    double dot(const Point& p) const { return x*p.x + y*p.y; }
    double cross(const Point& p) const { return x*p.y - y*p.x; }
    double norm() const { return sqrt(x*x + y*y); }
    bool operator<(const Point& p) const { return tie(x,y) < tie(p.x,p.y); }
    bool operator==(const Point& p) const { return abs(x-p.x) < 1e-9 && abs(y-p.y) < 1e-9; }
};
$0`
  },
  // 52. CONVEX HULL
  {
    prefix: 'convhull',
    description: "Convex Hull (Andrew's monotone chain)",
    body: `vector<Point> convex_hull(vector<Point> pts) {
    int n = pts.size();
    if(n < 3) return pts;
    sort(pts.begin(), pts.end());
    vector<Point> hull;
    // Lower hull
    for(auto& p : pts) {
        while(hull.size() >= 2 && (hull.back() - hull[hull.size()-2]).cross(p - hull[hull.size()-2]) <= 0)
            hull.pop_back();
        hull.push_back(p);
    }
    // Upper hull
    int lower_size = hull.size();
    for(int i = n - 2; i >= 0; i--) {
        while((int)hull.size() > lower_size && (hull.back() - hull[hull.size()-2]).cross(pts[i] - hull[hull.size()-2]) <= 0)
            hull.pop_back();
        hull.push_back(pts[i]);
    }
    hull.pop_back();
    return hull;
}
$0`
  },
  // 53. PII
  {
    prefix: 'pii',
    description: 'Pair<int,int> typedef',
    body: 'typedef pair<int,int> pii;$0'
  },
  // 54. VI
  {
    prefix: 'vi',
    description: 'Vector<int> typedef',
    body: 'typedef vector<int> vi;$0'
  },
  // 55. VLL
  {
    prefix: 'vll',
    description: 'Vector<long long> typedef',
    body: 'typedef vector<long long> vll;$0'
  },
  // 56. COORDINATE COMPRESSION
  {
    prefix: 'compress',
    description: 'Coordinate compression',
    body: `// Coordinate compression
vector<int> compress(vector<int>& a) {
    vector<int> sorted_a = a;
    sort(sorted_a.begin(), sorted_a.end());
    sorted_a.erase(unique(sorted_a.begin(), sorted_a.end()), sorted_a.end());
    vector<int> result(a.size());
    for(int i = 0; i < (int)a.size(); i++)
        result[i] = lower_bound(sorted_a.begin(), sorted_a.end(), a[i]) - sorted_a.begin();
    return result;
}
$0`
  },
  // 57. RANDOM
  {
    prefix: 'random',
    description: 'mt19937 random generator',
    body: `mt19937 rng(chrono::steady_clock::now().time_since_epoch().count());
int rand(int l, int r) { return uniform_int_distribution<int>(l, r)(rng); }
$0`
  },
];
