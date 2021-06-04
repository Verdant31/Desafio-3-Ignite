import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    
    //A variavel storageCart vai buscar os dados do Local Storage, ela pode ser string(caso ela encontre valor) ou null(caso não encontre).
    //Caso ela encontre um valor(seja string), o if sera acionado. 
    //Dentro do if, nós fazemos uma conversão do conteudo do carrinho para o tipo string, pois o conteudo do carrinho é do tipo array de produtos.
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      //Criando um array a partir do array original do carrinho(imutabilidade), esse array contem o mesmo valor do cart.
      const updatedCart = [...cart];
      //Verificando se o produto adicionado já existe dentro do carrinho
      const productExists = updatedCart.find(product => product.id === productId)
      //Armazenando a quantidade em estoque do produto
      //O JSONServer vai pegar automaticamente os dados do produto que tem o id = productId
      const stock = await api.get(`/stock/${productId}`);
      //Armazenando especificamente a propriedade amount do produto que o JSONServer retornou
      const stockAmount = stock.data.amount;
      // Quantidade atual DO PRODUTO no carrinho, se o produto existe no carrinho, armazena-se o amount dele, se não, a quantidade é zero, pois não está no carrinho.
      const currentAmount = productExists ? productExists.amount : 0. 
      //Quantidade desejada (Aumenta-se mais um pois o usuario está clickando para adicionar o produto no carrinho)
      const amount = currentAmount + 1;

      //Se a quantidade desejada for MAIOR que a quantidade em estoque do produto, mostrar erro
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      //Se o produto existe de fato, iremos atualizar a quantidade do produto, se não existe, iremos adicionar ele no carrinhno
      if (productExists) {
        productExists.amount = amount;
      }else {
        //Aqui pegamos os dados do produto que será adicionado ao carrinho
        const product = await api.get(`/products/${productId}`);
        //Como o carrinho espera o tipo Product tem amount como atributo, então vamos pegar todos os dados do retornados pela api, e criar um campo amount com valor 1
        //Pois os 'products' na api não tem o campo amount
        //Então pegamos os dados do produto e adicionamos o campo amount
        const newProduct = {
          ...product.data,
          amount: 1
        }
        //Passando esses dados para o carrinho
        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));


    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      //Antes de removermos, precisamos primeiro verificar se o produto existe no carrinho
      const updatedCart = [...cart];
      //Ao invés de utilizarmos o find, iremos utilizar o findIndex, pois com o index, podemos utilizar o splice, para podermos remover do array
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      //O findIndex caso não encontre nada, retorna -1
      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try { 
      //Verificar se a quantidade desejada for menor ou igual a zero, devemos mostrar o erro
      if(amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`)
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
