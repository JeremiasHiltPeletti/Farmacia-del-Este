import localforage from 'localforage';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_TASKS, INITIAL_ORDERS, INITIAL_NOTICES, INITIAL_COMPENSATORY, INITIAL_REFERENCE_PRODUCTS } from "./constants";

let memoryStore: Record<string, any> = {};
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

const ensureLoaded = async () => {
  if (isLoaded) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const stored = await localforage.getItem<Record<string, any>>('farmaciaMockStore');
        if (stored) {
          memoryStore = stored;
        } else {
            // Also try to migrate from old localStorage if IndexedDB is empty
            const legacy = localStorage.getItem('farmaciaMockStore');
            if (legacy) {
                memoryStore = JSON.parse(legacy);
            }
        }
      } catch (e) {
        console.error("Failed to load store from localforage", e);
      }

      const s = memoryStore;
      let updated = false;
      if (!s.categories) { s.categories = INITIAL_CATEGORIES.reduce((acc: any, c: any) => ({...acc, [c.id]: c}), {}); updated = true; }
      if (!s.products) { s.products = INITIAL_PRODUCTS.reduce((acc: any, p: any) => ({...acc, [p.id]: p}), {}); updated = true; }
      if (!s.referenceProducts) { s.referenceProducts = INITIAL_REFERENCE_PRODUCTS.reduce((acc: any, p: any) => ({...acc, [p.id]: p}), {}); updated = true; }
      if (!s.customers) { s.customers = INITIAL_CUSTOMERS.reduce((acc: any, c: any) => ({...acc, [c.id]: c}), {}); updated = true; }
      if (!s.tasks || !s.tasks['tc1']) { s.tasks = INITIAL_TASKS.reduce((acc: any, t: any) => ({...acc, [t.id]: t}), {}); updated = true; }
      if (!s.orders) { s.orders = INITIAL_ORDERS.reduce((acc: any, o: any) => ({...acc, [o.id]: o}), {}); updated = true; }
      if (!s.notices || s.notices['n3']?.text !== 'Llegan vacunas antigripales del PAMI') { 
           s.notices = INITIAL_NOTICES.reduce((acc: any, n: any) => ({...acc, [n.id]: n}), {}); 
           updated = true; 
      }
      if (!s.compensatory_entries) { s.compensatory_entries = INITIAL_COMPENSATORY.reduce((acc: any, c: any) => ({...acc, [c.id]: c}), {}); updated = true; }

      isLoaded = true;
      if (updated || localStorage.getItem('farmaciaMockStore')) {
        persistStore(s);
        localStorage.removeItem('farmaciaMockStore'); // Clean up old legacy store
      }

      for (const col in listeners) {
        notify(col);
      }
    })();
  }
  return loadPromise;
};

// Start loading immediately in background
ensureLoaded();

const getStore = () => {
  return memoryStore;
};

const persistStore = (store: any) => {
  localforage.setItem('farmaciaMockStore', store).catch(e => {
    console.error("Failed to save store to localforage", e);
  });
};

const setStore = (store: any) => {
  memoryStore = store;
  persistStore(memoryStore);
};

const listeners: Record<string, Function[]> = {};

const notify = (col: string) => {
   if(listeners[col]) {
     listeners[col].forEach(cb => cb());
   }
}

export const db = {};

export const collection = (db: any, path: string) => { return { type: 'collection', path }; };
export const doc = (db: any, path: string, id?: string) => { return { type: 'doc', path, id }; };
export const query = (col: any, ...args: any[]) => { return { ...col, args }; };
export const orderBy = (field: string, dir: string) => { return { type: 'orderBy', field, dir }; };
export const where = (field: string, op: string, value: any) => { return { type: 'where', field, op, value }; };
export const limit = (num: number) => { return { type: 'limit', num }; };


export class Timestamp {
   seconds: number;
   nanoseconds: number;
   constructor(sec: number, nano: number) { this.seconds = sec; this.nanoseconds = nano; }
   static now() { return Timestamp.fromDate(new Date()); }
   static fromDate(date: Date) { return new Timestamp(Math.floor(date.getTime() / 1000), 0); }
   toDate() { return new Date(this.seconds * 1000); }
}

export const onSnapshot = (ref: any, callback: Function) => {
   const col = ref.path || ref.type === 'collection' && ref.path;
   if (!col) return () => {};
   if (!listeners[col]) listeners[col] = [];
   
   const trigger = () => {
       const s = getStore();
       const data = s[col] || {};
       let docs = Object.values(data).map((d: any) => ({
           id: d.id,
           data: () => d
       }));
       
       if (ref.args) {
          const orderArg = ref.args.find((a: any) => a.type === 'orderBy');
          if (orderArg) {
             docs.sort((a,b) => {
                const fa = a.data()[orderArg.field];
                const fb = b.data()[orderArg.field];
                
                const va = fa?.seconds ? fa.seconds : fa;
                const vb = fb?.seconds ? fb.seconds : fb;
                
                if (va == null && vb == null) return 0;
                if (va == null) return 1;
                if (vb == null) return -1;
                
                if (va < vb) return orderArg.dir === 'desc' ? 1 : -1;
                if (va > vb) return orderArg.dir === 'desc' ? -1 : 1;
                return 0;
             });
          }
       }

       callback({
           docs,
           metadata: { hasPendingWrites: false }
       });
   };
   
   listeners[col].push(trigger);
   trigger();
   
   return () => {
       listeners[col] = listeners[col].filter((cb: any) => cb !== trigger);
   };
};

export const addDoc = async (col: any, data: any) => {
    await ensureLoaded();
    const s = getStore();
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const path = col.path;
    if(!s[path]) s[path] = {};
    s[path][id] = JSON.parse(JSON.stringify({ ...data, id }));
    setStore(s);
    notify(path);
    return { id };
}

export const setDoc = async (ref: any, data: any) => {
    await ensureLoaded();
    const s = getStore();
    if(!s[ref.path]) s[ref.path] = {};
    s[ref.path][ref.id] = JSON.parse(JSON.stringify({ ...data, id: ref.id }));
    setStore(s);
    notify(ref.path);
}

export const updateDoc = async (ref: any, data: any) => {
    await ensureLoaded();
    const s = getStore();
    if(!s[ref.path]) s[ref.path] = {};
    s[ref.path][ref.id] = JSON.parse(JSON.stringify({ ...s[ref.path][ref.id], ...data }));
    setStore(s);
    notify(ref.path);
}

export const deleteDoc = async (ref: any) => {
    await ensureLoaded();
    const s = getStore();
    if(s[ref.path]) {
        delete s[ref.path][ref.id];
        setStore(s);
        notify(ref.path);
    }
}

export const writeBatch = (db: any) => {
    const operations: {type: 'set'|'update'|'delete', ref: any, data?: any}[] = [];
    return {
        set: (ref: any, data: any) => {
            operations.push({type: 'set', ref, data});
        },
        update: (ref: any, data: any) => {
            operations.push({type: 'update', ref, data});
        },
        delete: (ref: any) => {
            operations.push({type: 'delete', ref});
        },
        commit: async () => {
            await ensureLoaded();
            const s = getStore();
            const modifiedPaths = new Set<string>();
            for(let op of operations) {
                if(!s[op.ref.path]) s[op.ref.path] = {};
                if (op.type === 'set') {
                    s[op.ref.path][op.ref.id] = JSON.parse(JSON.stringify({ ...op.data, id: op.ref.id }));
                } else if (op.type === 'update') {
                    s[op.ref.path][op.ref.id] = JSON.parse(JSON.stringify({ ...s[op.ref.path][op.ref.id], ...op.data }));
                } else if (op.type === 'delete') {
                    delete s[op.ref.path][op.ref.id];
                }
                modifiedPaths.add(op.ref.path);
            }
            setStore(s);
            for(let path of Array.from(modifiedPaths)) {
                notify(path);
            }
        }
    }
}

export const getDocs = async (ref: any) => {
    await ensureLoaded();
    const col = ref.path || (ref.type === 'collection' && ref.path);
    if (!col) return { docs: [], empty: true };
    const s = getStore();
    const data = s[col] || {};
    let docs = Object.values(data).map((d: any) => ({
        id: d.id,
        data: () => d
    }));
    
    if (ref.args) {
        const whereArgs = ref.args.filter((a: any) => a.type === 'where');
        for (const w of whereArgs) {
            docs = docs.filter(d => {
                const val = d.data()[w.field];
                if (w.op === '==') return val === w.value;
                if (w.op === 'in') return Array.isArray(w.value) && w.value.includes(val);
                if (w.op === 'array-contains') return Array.isArray(val) && val.includes(w.value);
                return true;
            });
        }
        const orderArg = ref.args.find((a: any) => a.type === 'orderBy');
        if (orderArg) {
            docs.sort((a, b) => {
                const fa = a.data()[orderArg.field];
                const fb = b.data()[orderArg.field];
                const va = fa?.seconds ? fa.seconds : fa;
                const vb = fb?.seconds ? fb.seconds : fb;
                if (va == null && vb == null) return 0;
                if (va == null) return 1;
                if (vb == null) return -1;
                if (va < vb) return orderArg.dir === 'desc' ? 1 : -1;
                if (va > vb) return orderArg.dir === 'desc' ? -1 : 1;
                return 0;
            });
        }
        const limitArg = ref.args.find((a: any) => a.type === 'limit');
        if (limitArg) {
            docs = docs.slice(0, limitArg.num);
        }
    }
    
    return {
        docs,
        empty: docs.length === 0,
        size: docs.length
    };
};

