import { useRef, useEffect, useState } from "react";
import logo from './logo.png'
import board from './board.png'
import rule_jpg from './rule.jpg'
// import bg from './bg.png'
import './App.css';

const PEEK = 'peek';
const SPY = 'spy';
const SWAP = 'swap';
const PEEK_TIME = 1000;
const LOGICALLY_SMALL = 5;

const NUMS = 13; // 牌面数字最大值
const GROUP = 4; // 每种数字牌的数量
// let cards = [];
function createDeck() {
  let cards = [];
  for(let i=0; i<=NUMS; i++) {
    for(let j=0; j<GROUP; j++) {
      cards[i * GROUP + j] = i;
    }
  };

  return cards.splice(2, 52);
}
// cards = createDeck();

function getRandom(num) {
  return Math.floor(Math.random() * num);
}

function App() {

  // function useCallbackState(od) {
  //   const cbRef = useRef();
  //   const [data, setData] = useState(od);

  //   useEffect(() => {
  //     cbRef.current && cbRef.current(data);
  //   }, [data]);

  //   return [
  //     data,
  //     function (d, callback) {
  //       console.log('useCallbackState', d);
  //       cbRef.current = callback;
  //       setData(d);
  //     }
  //   ];
  // }

  const [cards, setCards] = useState(createDeck())
  const [discardPile, trash] = useState([false]);                          // 弃牌堆
  const [gamePlayer, setPlayer] = useState(0);
  const [hardMode, setHardMode] = useState(false);                         // 困难模式
  const [started, gameStart] = useState(false);                            // 开始
  const [ended, gameEnd] = useState(false);                                // 结束
  const [round, yourTurn] = useState(false);                               // 是否自己的回合
  const [startPeekCount, startPeeked] = useState(2);                       // 开始前查看两张牌
  const [peekable, setPeekable] = useState(false);                         // 是否可以使用 peek
  const [spyable, setSpyable] = useState(false);                           // 是否可以使用 spy
  const [swappable, setSwappable] = useState(false);                       // 是否可以使用 swap

  const [curSkill, setSkill] = useState(false);                            // 当前技能名称
  const [queue, setQueue] = useState([]);                                  // 替换队列
  const [peeking, setPeeking] = useState([[], []]);                        // 正在查看
  const [hasQueue, setHasQueue] = useState(false);                         // 是否有替换队列
  const [swapQueue, setSwap] = useState([false, false]);                   // swap 队列

  const [drawingCard, setDrawingCard] = useState(false);                   // 当前抽取的牌
  const [playerOneCards, setPlayerOneCards] = useState([]);                // 玩家1的牌
  const [playerTwoCards, setPlayerTwoCards] = useState([]);                // 玩家2的牌
  const [playerThreeCards, setPlayerThreeCards] = useState([]);            // 玩家3的牌
  const [playerFourCards, setPlayerFourCards] = useState([]);              // 玩家4的牌
  const [result, setResult] = useState(['', '', '', '']);                  // 对局结果

  const [logs, writeLog] = useState([]);                                   // 日志
  const [rule, viewRule] = useState(false);                                // 查看规则

  // 一个玩家占一行
  const AssignLine = ({ player, list }) => {
    // let { locale } = useLocale();
    let is_current_player = +(player === 1);
    return (
      <div className="card_list line">
        <span className="keyword let"></span>

        <span className="var">{player === 1 ? 'self' : ('player_' + player)}</span>

        <span className="sign equal"></span>

        <span className="res">[
          {list.map((card, i) => {
            return <span className="card" key={`player_${player}_${i}`}>
              {i ? (<span className="mark">,</span>) : ""}
              <span className={'number' +
                ((is_current_player && queue[i]) ? ' card--highlight' : '') + // 已选中
                (peeking[is_current_player][i] ? ' card-peeking' : '') + // 正在查看
                // (card.comView ? ' card--comView' : '') + // 电脑已查看
                ((swapQueue[is_current_player] === i) ? ' card-swapping' : '') + // swap 选中
                ((card.show || peeking[is_current_player][i]) ? ' card-show' : ' card-hide') // 展示与否
              } onClick={() => usingSkill(is_current_player, i)}>
                {(peeking[is_current_player][i] || card.show || ended) ? card.number : '__'}
              </span>
            </span>
          })}
        ]</span>

        <span className="mark semicolon"></span>

        {
          is_current_player ? (
            (started || ended) ? (
              (hasQueue || result[0]) ? (
                <span className="comment">
                  {result[0] ? <span>{result[0]}</span> : ''}
                  {hasQueue ? <span className="skill" onClick={exchange}>exchange</span> : ""}
                </span>
              ) : '') : (
              startPeekCount ? (
                <span className="comment">
                  <span>peek {startPeekCount === 2 ? '2 cards' : 'another card'} before start</span>
                </span>
              ) : ''
            )
          ) : (result[1] ? <span className="comment">{result[1]}</span> : '')
        }
      </div>
    );


    <div className="card_list line">

    </div>
  };


  // 从剩余牌堆里，随机返回一张牌
  function pick(num) {
    let len = cards.length;
    let index = cards.indexOf(num);
    num = (index > -1) ? getRandom(index) : getRandom(len);
    let card = cards.splice(num, 1)[0];
    setCards([...cards]);

    pushLog(`pick <span class="cover">${card}</span>`);

    return card;
  }

  // 抽牌，判断是否有技能可以用
  function draw() {
    if(ended) {
      return pushLog('The game is over.');
    }

    if(started) {
      if(round && !drawingCard) {

        let card = pick();
        setDrawingCard(card);
        pushLog('draw success, the card is ' + card);

        switch(card) {
          case 7:
          case 8:
            setSkill(PEEK);
            break;
          case 9:
          case 10:
            setSkill(SPY);
            break;
          case 11:
          case 12:
            setSkill(SWAP);
            break;
          default:;
        }
      } else {
        pushLog(`draw fail, ${round ? 'card been drew' : 'not your turn'}`);
      }
    } else {
      pushLog(`draw fail, have to peek ${startPeekCount === 2 ? 'two cards' : 'another card'} before start`);
    }
  };

  function pass() {
    yourTurn(false);
    setTimeout(() => {
      mockOpponentTurn();
    }, PEEK_TIME);
  }

  // 虚拟玩家执行动作
  function mockOpponentTurn(self = 2) {
    console.log(`player ${self} action: mockOpponentTurn`);
    pushLog(`player ${self} action: mockOpponentTurn`);

    let ownCards = ['', playerOneCards, playerTwoCards, playerThreeCards, playerFourCards][self];
    let setOwnCards = ['', setPlayerOneCards, setPlayerTwoCards, setPlayerThreeCards, setPlayerFourCards][self];

    // 判断是否胜利
    let knowAllSelfCard = true;
    let unknowCard = false;
    let resSelf = ownCards.reduce((previousValue, currentCard) => {
      if(!currentCard.comView) {
        pushLog(`player ${self} status: unknow card at com`);
        knowAllSelfCard = false;
        if(unknowCard === false) {
          unknowCard = ownCards.indexOf(currentCard);
        }
      }

      return previousValue + currentCard.number;
    }, 0);


    // 如果已经知道了自己所有的牌，则进行胜利条件判断
    if(knowAllSelfCard) {
      console.log(`player ${self} status: knowing all card it owns.`);

      let resMin = Math.min([playerOneCards, playerTwoCards, playerThreeCards, playerFourCards].map(cards => {
        return cards.reduce((previousValue, currentCard) => {
          return previousValue + currentCard.number;
        }, 0);
      }));

      console.log(`player ${self} status: consider current Min: ${resMin}.`);

      if(resMin === resSelf) {
        // 若自己的牌比场上已知的所有人的牌都小，则宣告胜利
        pushLog(`player ${self} action: call out Cabo`);
        cabo();
        return;
      }
    }

    // 如果弃牌堆足够小，则以未查看过的牌替换该牌
    if(discardPile[0] < LOGICALLY_SMALL) {
      let discardingCard = ownCards[unknowCard].number;
      ownCards[unknowCard] = {
        number: discardPile[0],
        comView: true,
        show: true
      };

      setOwnCards([...ownCards]);
      setDiscardPile(discardingCard);

      return;
    }

    // 筛选已知的牌，将最大的牌的下标挑选出来
    let maxCardIndex = 0;
    let knownCards = ownCards.map((card, i) => {
      if(card.comView) {
        if(card.number > ownCards[maxCardIndex].number) {
          maxCardIndex = i;
        }

        let knownCard = JSON.parse(JSON.stringify(card));
        knownCard.ori_index = i;

        return knownCard;
      } else {
        return false;
      }
    });

    // knownCards = knownCards.filter(card => {return card});
    let maxCard = [ownCards[maxCardIndex]];
    let maxCardNum = maxCard[0].number;
    let maxCardTotal = maxCardNum;

    pushLog('opponent action: check same cards');
    // 判断已知的牌里是否有重复牌
    let pureCards = [...new Set(knownCards.map(card => card.number))];
    pushLog('knownCards.length - pureCards.length = ' + (knownCards.length - pureCards.length));
    if(knownCards.length - pureCards.length) {
      // 有相同的牌
      pushLog('some card is the same');
      let group = {};

      for(let card of pureCards) {
        group[card] = {
          card,
          num: 0,
          index: []
        };
        knownCards.map((knownCard, i) => {
          if(knownCard.number == card) {
            group[card].num++;
            group[card].index.push(knownCard.ori_index);
          }
        });
      }
      pushLog('group: ' + JSON.stringify(group));

      // 找出合计值最大的一组，令 maxCard 为这一组牌
      for(let i in group) {
        let card = group[i];
        let curGroup = card.card * card.num;
        if(curGroup > maxCardTotal) {
          maxCardTotal = curGroup;
          maxCardNum = card.card;
          maxCard = card.index;
        }
      }
      pushLog('maxCardTotal:' + maxCardTotal);
      pushLog('maxCard:' + JSON.stringify(maxCard));
    }

    // 置换弃牌堆的牌
    let from_discard = discardPile[0] < maxCardTotal;
    pushLog(`opponent action: exchange from ${from_discard ? 'discardPile' : 'deck'}`);


    // let count = getRandom(2) + 10;
    // pick(count)
    let card = from_discard ? discardPile[0] : pick();
    let used = false;
    pushLog(`opponent exchange card [${maxCardIndex}] with ${from_discard ? 'discardPile' : 'deck'}`);

    if(card < maxCardTotal) {
      if(maxCard.length > 1) {
        // let newDiscardPile = [...discardPile];
        let cardsDiscarded = ownCards.filter(card => {
          return card.comView ? (card.number != maxCardNum) : true;
        });

        cardsDiscarded.push({
          show: true,
          comView: true,
          number: card
        });
        setOwnCards([...cardsDiscarded]);

        pushLog(`opponent exchange cards ${JSON.stringify(maxCard)} with discardPile`);
        for(let i=0; i<maxCard.length; i++) {
          setDiscardPile(maxCardNum);
        }
      } else {
        let discardingCard = ownCards[maxCardIndex].number;
        ownCards[maxCardIndex].number = card;
        setOwnCards([...ownCards]);

        setDiscardPile(discardingCard);
      }
    } else if(!from_discard) {
      switch(card) {
        case 7:
        case 8:
          // setSkill(PEEK);
          ownCards.map((card, i) => {
            if(!used && !card.comView) {
              pushLog(`opponent action: use skill peek ownCards [${i}]`);
              card.comView = true;
              used = true;
            }
          });
          setOwnCards([...ownCards]);

          break;
        case 9:
        case 10:
          // setSkill(SPY);
          playerOneCards.map((card, i) => {
            if(!used && !card.comView) {
              pushLog(`opponent action: use skill spy playerOneCards [${i}]`);
              card.comView = true;
              used = true;
            }
          });
          setPlayerOneCards([...playerOneCards]);
          break;
        case 11:
        case 12:
          // setSkill(SWAP);
          let selfMax = ownCards[maxCardIndex];
          let ownMin = 5;
          let hasKnow = false;
          playerOneCards.map((card, i) => {
            if(card.comView) {
              hasKnow = true;

              if(card.number < playerOneCards[ownMin].number) {
                ownMin = i;
              }
            }
          });

          if(hasKnow) {
            pushLog(`opponent check max [${maxCardIndex}]: ${selfMax.number}`);
            pushLog(`opponent check min [${ownMin}]: ${playerOneCards[ownMin].number}`);

            if(selfMax.number > playerOneCards[ownMin].number) {
              let mid = ownCards[maxCardIndex];
              ownCards[maxCardIndex] = playerOneCards[ownMin];
              playerOneCards[ownMin] = mid;

              pushLog(`--- --- before --- ---`);
              pushLog('ownCards' + JSON.stringify(ownCards.map(card => {return card.number})));
              pushLog('playerOneCards' + JSON.stringify(playerOneCards.map(card => {return card.number})));
              pushLog(`--- --- before --- ---`);

              pushLog(`--- --- --- --- ---`);
              setPlayerTwoCards(ownCards);
              setPlayerOneCards(playerOneCards);
              pushLog(`--- --- --- --- ---`);

              pushLog(`--- --- after --- ---`);
              pushLog('ownCards' + JSON.stringify(...ownCards.map(card => {return card.number})));
              pushLog('playerOneCards' + JSON.stringify(...playerOneCards.map(card => {return card.number})));
              pushLog(`--- --- after --- ---`);
            }
          }
          break;
        default:
      }

      setDiscardPile(card);
    }

    // setDiscardPile(card);
    setTimeout(() => {
      if(gamePlayer == self) {
        yourTurn(true);
      } else {
        mockOpponentTurn(self + 1);
      }
    }, PEEK_TIME);
  }

  // 使用技能
  function useSkill() {
    switch(curSkill) {
      case PEEK:
        setPeekable(true);
      break;
      case SPY:
        setSpyable(true);
      break;
      case SWAP:
        setSwappable(true);
      break;
      default:;
    }
  }

  // 指定技能的目标牌
  function usingSkill(type, i) {
    if(ended) {
      return pushLog('The game is over.');
    }

    const typeName = type ? 'own' : 'opponent';
    switch(curSkill) {
      case PEEK:
        pushLog(`peeking ${typeName}'s card [${i}]`);
      break;
      case SPY:
        pushLog(`spying ${typeName}'s card [${i}]`);
      break;
      case SWAP:
        pushLog(`swapping cards`);
      break;
      default:;
    }

    // 尚未开始时，需查看自己两张牌
    if(!started) {
      // pushLog('check started yet: false');
      if(!type) {
        pushLog(`can not peek opponent's card`);
        return;
      }

      if(peeking[1][i]) {
        pushLog('peeking the same card');
      } else if(startPeekCount) {
        let peekCount = startPeekCount - 1;
        startPeeked(peekCount);
        pushLog(`startPeekCount: ${startPeekCount}`);

        peeking[1][i] = true;
        setPeeking([...peeking]);

        if(!peekCount) {
          for(let i=1e3; i<=PEEK_TIME; i+=1e3) {
            setTimeout(() => {
              if(i === PEEK_TIME) {
                setPeeking([[], []]);
                clearSkill();

                gameStart(true);
                let defaultTrash = pick();
                setDiscardPile(defaultTrash);
                yourTurn(true);
                pushLog('game start');
                pushLog('--- --- --- --- ---');
              } else {
                pushLog(`peek countdown: ${PEEK_TIME - i + 1e3}`);
              }
            }, i);
          }
        }
      }

      return;
    }

    // 如果没有抽牌且弃牌堆为空，则无法选中卡牌
    if(!discardPile.length && !drawingCard) {
      return;
    }

    if(swappable) {
      swapQueue[type] = i;
      setSwap(swapQueue);

      if((swapQueue[0] !== false) && (swapQueue[1] !== false)) {
        let mid = playerTwoCards[swapQueue[0]];
        playerTwoCards[swapQueue[0]] = playerOneCards[swapQueue[1]];
        playerOneCards[swapQueue[1]] = mid;

        setPlayerTwoCards(playerTwoCards);
        setPlayerOneCards(playerOneCards);
        setSwap([false, false]);
        discard();
      }

      // if(!type) {
      //   swapQueue[type]
      // } else {
      // }
    } else if(!type) {
      if(peekable) {
        pushLog(`Can not peek opponent's card`);
      } else if(spyable) {
        if(peeking[0].length) {
          return;
        }

        if(playerTwoCards[i].show) {
          pushLog(`The card is showing`);
        } else {
          peeking[0][i] = true;
          setPeeking([...peeking]);
          setTimeout(() => {
            // peeking[0][i] = false;
            // setPeeking([...peeking]);
            setPeeking([[], []]);

            discard();
          }, PEEK_TIME);

          pushLog(`The card is ${playerTwoCards[i].number}`);
        }
      }
    } else {
      if(peekable) {
        if(peeking[1].length) {
          return;
        }

        if(playerOneCards[i].show) {
          pushLog(`The card is showing`);
        } else {
          peeking[1][i] = true;
          setPeeking([...peeking]);
          setTimeout(() => {
            // peeking[1][i] = false;
            // setPeeking([...peeking]);
            setPeeking([[], []]);

            discard();
          }, PEEK_TIME);

          pushLog(`The card is ${playerOneCards[i].number}`);
        }
      } else if(spyable) {
        pushLog(`Can not spy yourselves card`);
      } else {
        pushLog(`before setQueueing ${i}`);
        setQueueing(i);
        // playerOneCards[i].highlight = !playerOneCards[i].highlight;
        // pushLog(JSON.stringify(playerOneCards));
        // setPlayerOneCards(playerOneCards);
      }
    }
  }

  // 换牌时选中的牌数
  function setQueueing(i) {
    queue[i] = !queue[i];
    setQueue([...queue]);
  }

  // 清除选中的牌
  function clearQueue() {
    setQueue([false, false, false, false]);
  }

  // 将牌放入弃牌堆
  function setDiscardPile(card) {
    pushLog(`discardPile ${card}`);
    discardPile.unshift(card);
    trash([...discardPile]);
  }

  // 换牌
  function exchange() {
    let len = 0;
    let ex_id = 0;
    queue.map((val, i) => {
      if(val) {
        len += 1;
        ex_id = i;
      }

      return val;
    });

    if(len === 1) {
      let curDiscard = playerOneCards[ex_id].number;
      playerOneCards[ex_id] = {
        show: drawingCard === false,
        comView: drawingCard === false,
        // unuseStat: false,
        number: (drawingCard === false) ? discardPile[0] : drawingCard
        // 若已抽牌，则换当前手牌，否则换弃牌堆中的牌；
        // 抽到的卡为 0 时，单独处理
      };

      if(drawingCard === false) {
        discardPile.shift();
        trash([...discardPile]);
      }

      setDiscardPile(curDiscard);
      setDrawingCard(false);
    } else if(len < 1) {
      return;
    } else {
      let exchangable = true;
      let card_base = playerOneCards[ex_id].number;
      pushLog('queue map'); 
      queue.map((val, i) => {
        if(val && (playerOneCards[i].number !== card_base)) {
          pushLog('The selecting card is ' + playerOneCards[i].number);

          exchangable = false;
        }

        return val;
      });
      setPlayerOneCards([...playerOneCards]);

      let show = drawingCard === false;
      if(exchangable) {
        let curCards = playerOneCards.filter(card => {
          return card.number !== card_base;
        });
        console.log(curCards);

        curCards.push({
          show,
          comView: show,
          // 若为抽取的牌，则暗置，否则正面显示
          number: (drawingCard === false) ? discardPile[0] : drawingCard
          // 若已抽牌，则换当前手牌，否则换弃牌堆中的牌；
          // 抽到的卡为 0 时，单独处理
        });

        for(let i=0; i<len; i++) {
          setDiscardPile(card_base);
        }

        setDrawingCard(false);
        setPlayerOneCards(curCards);
      } else {
        pushLog('They are not the same number');

        queue.map((val, i) => {
          playerOneCards[i].show = true;
          playerOneCards[i].comView = true;
        });

        playerOneCards.push({
          show,
          comView: show,
          // 若为抽取的牌，则暗置，否则正面显示
          number: show ? discardPile[0] : drawingCard
          // 若已抽牌，则换当前手牌，否则换弃牌堆中的牌；
          // 抽到的卡为 0 时，单独处理
        });
        if(drawingCard === false) {
          discardPile.splice(1);
          trash([...discardPile]);
        }

        setDrawingCard(false);

        if(len > 2) {
          // 如果选中的牌多于两张，额外惩罚一张
          let card = pick();
          playerOneCards.push({
            show: false,
            comView: false,
            // unuseStat: false,
            number: card
          });
        }
      }
    }

    clearQueue();
    pass();

    console.log('playerOneCards');
    console.log(playerOneCards);
  }

  // 弃牌时清除技能
  function clearSkill() {
    setSwappable(false);
    setSpyable(false);
    setPeekable(false);
    setSkill(false);
  }

  // 弃牌
  function discard() {
    clearSkill();
    drawingCard !== false && setDiscardPile(drawingCard);
    setDrawingCard(false);
    clearQueue();
    pass();
  }

  function countResult(list, card_list) {
    // return card_list.reduce((previousValue, currentValue) => previousValue + currentValue.number, 0)
    list.push(card_list.reduce((previousValue, currentValue) => previousValue + currentValue.number, 0));
  }

  // 宣告胜利
  function cabo() {
    if(ended) {
      return pushLog('The game is over.');
    }

    gameEnd(true);
    pushLog('game over!');

    let points = [];
    for(let i=0; i<gamePlayer; i++) {
      countResult(points, [playerOneCards, playerTwoCards, playerThreeCards, playerFourCards][i]);
    }

    let min = Math.min(...points);

    setResult(points.map((point, i) => {
      let winner = (point === min);
      !i && pushLog(winner ? 'YOU WIN!' : 'YOU LOSE~');

      return `total: ${points[i]}, ${winner ? 'win' : 'lose'}.`;
    }));
    // let res = points.map((point, i) => {
    // });
  }

  let dom_log = document.querySelector('.log');
  let dom_log_lines = document.querySelector('.log-lines');

  // 屏幕下方 log
  function pushLog(log) {
    if((typeof log) === 'object') {
      log = JSON.stringify(log);
    }

    // logs.unshift(log);
    logs.push(log);
    writeLog([...logs]);

    if(dom_log && dom_log_lines) {
      setTimeout(() => {
        dom_log.scrollTop = dom_log_lines.offsetHeight;
      }, 100)
    }

  }

  useEffect(() => {
    clearLog();
    setCards(createDeck());

    if(gamePlayer) {
      for(let i=0; i<gamePlayer; i++) {
        let defaultCards = [];

        for(let j=0; j<GROUP; j++) {
          let number = pick();

          defaultCards.push({
            show: false,
            // comView: false,
            comView: i ? (j < 2) : false,
            // unuseStat: false,
            number
          });
        }

        console.log('start', i);

        switch(i) {
          case 3:
            setPlayerFourCards(defaultCards);
            break;
          case 2:
            setPlayerThreeCards(defaultCards);
            break;
          case 1:
            setPlayerTwoCards(defaultCards);
            break;
          default:
            setPlayerOneCards(defaultCards);
        }
      }

      clearQueue();

      setSkill(PEEK);
      setPeekable(true);
      console.log('started');
    }
  }, [gamePlayer]);
  // function start() {
  // }

  // 初始化
  function init() {
    console.log('init');
    // start();
    console.log('inited');

    init = () => {};
  };

  useEffect(() => {
    playerOneCards.length && setPlayerOneCards(playerOneCards);
    let queues = false;
    queue.map(val => {
      if(val) {
        queues = true;
      }

      return val;
    });
    setHasQueue(queues);
  }, [queue, playerOneCards]);

  function setGamePlayer(num, hard) {
    console.log('setGamePlayer');
    console.log(num);
    setPlayer(num);

    hard && console.log(hard);

    init();
  }


  function cheating() {
    pushLog('- - - - shame - - - -');
    playerFourCards.length && pushLog('playerFourCards:' + JSON.stringify(playerFourCards.map(card => card.number)));
    playerThreeCards.length && pushLog('playerThreeCards:' + JSON.stringify(playerThreeCards.map(card => card.number)));
    pushLog('playerTwoCards:' + JSON.stringify(playerTwoCards.map(card => card.number)));
    pushLog('playerOneCards:' + JSON.stringify(playerOneCards.map(card => card.number)));
    pushLog('- - - - shame - - - -');
  }

  function clearLog() {
    writeLog([]);
  }

  // 重启游戏
  function restart() {
    setPlayer(false);
    // start();
  }

  return (
    <div className="App">
      {
        // true ? (
        gamePlayer ? (
          <div className="playing-board">
            <div id="cheating" className="hiddenBtn" onClick={cheating}>cheating</div>

            {round ? (
              <div className="round-hint">
                <span className="keyword function"></span>
                <span className="method">your_turn</span>
                {'{'}
              </div>
            ) : ''}

            {/* 对手 */}
            <AssignLine player={2} list={playerTwoCards} />
            {playerThreeCards.length ? <AssignLine player={3} list={playerThreeCards} /> : ''}
            {playerFourCards.length ? <AssignLine player={4} list={playerFourCards} /> : ''}


            {/* 弃牌堆 */}
            {/*<div className={'btn line' + (drawingCard ? ' comment' : '')}>*/}
            <div className="line comment">
              <span className="keyword const"></span>

              <span className="var">discardPile</span>

              <span className="sign equal"></span>

              <span className="number">{(discardPile[0] === false) ? "''" : discardPile[0]}</span>

              <span className="mark semicolon"></span>

              <span className="comment">{discardPile.join(',').replace(/,?false/, '')}</span>
            </div>

            {/* 剩余牌堆 */}
            <div className="line">
              <span className="keyword const"></span>

              <span className="var">deck</span>

              <span className="sign equal"></span>

              <span className="number">{cards.length}</span>

              <span className="mark semicolon"></span>
            </div>

            {/* 抽牌 */}
            <div className="line">
              <span className="keyword const"></span>

              <span className="var btn" onClick={draw}>draw</span>

              <span className="sign equal"></span>

              <span className="number">{(drawingCard !== false) ? drawingCard : "''"}</span>

              <span className="mark semicolon"></span>

              {(drawingCard !== false) ? (
                <span className="comment">
                  {curSkill ? <span className="skill" onClick={useSkill}>{curSkill}</span> : ''}
                  <span className="btn" onClick={discard}>discard</span>
                </span>) : <span className="comment skill" onClick={cabo}>Cabo</span>
              }
            </div>


            {/* 自己 */}
            <AssignLine player={1} list={playerOneCards} />

            {round ? <div className="round-hint">{'}'}</div> : ''}

            <pre>
              <code>
                <div>################################################################################</div>
                <a id="clearLog" className="hiddenBtn" style={{marginTop: '1em'}} onClick={clearLog}>clearLog</a>
                <div>#</div>
                <div>#  <span className="var">queue</span>
                         <span className="sign equal"></span>
                         <span>[{
                          queue.map((val, i) => {
                            return <>
                              {i ? <span className="mark">,</span> : ''}
                              <em className="boolean">{val ? 'true' : 'false'}</em>
                            </>
                          })
                         }]</span>
                         {/*<span className="string">'{queue.length && queue.join(',')}'</span>*/}
                </div>
                <div>#</div>
                <div>#  <span className="var">curSkill</span>
                         <span className="sign equal"></span>
                         {curSkill ? <span className="string">"{curSkill}"</span> : <em className="boolean">false</em>}
                </div>
                <div>#  <span className="var">peekable</span>
                         <span className="sign equal"></span>
                         <em className="boolean">{peekable ? 'true' : 'false'}</em>
                </div>
                <div>#  <span className="var">spyable</span>
                         <span className="sign equal"></span>
                         <em className="boolean">{spyable ? 'true' : 'false'}</em>
                </div>
                <div>#  <span className="var">swappable</span>
                         <span className="sign equal"></span>
                         <em className="boolean">{swappable ? 'true' : 'false'}</em>
                </div>
                <div>#</div>
                <div>################################################################################</div>
                <div className="log">
                  <div className="log-lines">
                    {logs.length ? (
                      <>
                        <div>#</div>
                        {
                          logs.map((log, i) => {
                            return <div key={'log_' + i}>
                              {/* logs.length - i */}
                              #&nbsp; {i + 1}. <span dangerouslySetInnerHTML={{__html: log}}></span>
                            </div>
                          })
                        }
                        <div>#</div>
                      </>
                    ) : ''}
                  </div>
                </div>
              </code>
            </pre>

          </div>
        ) : (
          rule ? <div className="rule">
            <main className="container">
              <div className="side">
                  <h1><img src={logo} alt="" className="logo" onClick={() => viewRule(false)} /></h1>
                  <p>接近祂，找到祂，名为 CABO 的神秘独角兽。牌上的数字代表着你与祂的距离。游戏结束时最接近 CABO 的玩家获得胜利！</p>
                  <h2 className="line-title">游戏设置</h2>
                  <p>洗混牌库。向每个玩家面朝下发 4 张牌并排成一行。将牌库面朝下放置在桌子的中央，并将牌库最顶端的一张牌面朝上放置在牌库的一旁形成弃牌堆。</p>
                  <img src={board} alt="" className="board" />
                  <p>秘密地查看你面前的任意 2 张牌并且记住它们（这是玩家除了经其他指示外，最后一次看面前的牌的机会）。玩家不能交换面前的牌的顺序。</p>
                  <p>随机选取一个起始玩家</p>
                  <h2 className="line-title">游戏过程</h2>
                  <p>从起始玩家开始，顺时针进行游戏。在你的回合，你可以从牌库或者弃牌堆抽一张牌，或者宣告 CABO。</p>
                  <p className="line-large">从牌库抽牌</p>
                  <p>从牌库最顶端抽一张牌，之后查看这张牌并从以下行动中选择一个执行：</p>
                  <p><strong>1）将这张牌放置到弃牌堆。</strong>如果这张牌有特殊能力，你可以选择使用。</p>
                  <p className="center">或者</p>
                  <p><strong>2）用你的一张或多张牌交换这张牌。</strong>将换出的牌面朝上放置到弃牌堆，并且将换入的牌面朝下放置到你面前换出的牌所在位置。参照规则书「交换多张牌」部分以了解交换多张相同牌的细节。</p>
                  <p className="line-large">从弃牌堆抽牌</p>
                  <p>从弃牌堆最顶端抽一张牌，之后<strong>用你的一张或多张牌交换这张牌。</strong>将换出的牌面朝上放置到弃牌堆，并且将换入的牌面朝上放置到你面前换出的牌所在位置。</p>
                  <p className="line-large">宣告 CABO</p>
                  <p>如果宣告 CABO，你的回合结束。其他玩家再各自按顺序进行一个回合，之后结束这一轮。</p>
              </div>
              <div className="side">
                  <h2 className="line-title mt0">交换多张牌</h2>
                  <p>如果想要用多张牌进行交换，换出的牌必须为同样数字（比如全都是 6）。在弃掉它们之前，将它们向前推出，并且翻开其中所有面朝下的牌，将换入的牌放置到其中一张换出的牌的位置上。</p>
                  <p>如果推出的牌数字不相同，将它们返回至原位置并保<span className="expand-row">持面朝上。将抽到的牌放置到你面前最左或最右的位置。</span></p>
                  <p>如果有三张或者更多的牌不相同，从牌库额外抽一张牌，并且面朝下放置到你面前最左或最右的位置，你不能看这张牌。</p>
                  <h2 className="line-title">卡牌特殊能力</h2>
                  <p>如果你从牌库抽到一张有特殊能力的牌，你可以将这<span className="expand-row">张牌放置到弃牌堆，并且可以选择使用它的能力，诸如：</span></p>
                  <dl>
                    <dt>7-8 PEEK：</dt>
                    <dd>秘密地查看你自己的一张面朝下的牌。</dd>
                    <dt>9-10 SPY：</dt>
                    <dd>秘密地查看其他一位玩家的一张面朝下的牌。</dd>
                    <dt>11-12 SWAP：</dt>
                    <dd>将你的一张牌和另外一位玩家的一张牌交换（不要改变这两张牌的正反）。</dd>
                  </dl>
                  <h2 className="line-title">神风特攻队</h2>
                  <p>如果一个玩家在当轮结束时，面前有且仅有 2 张 13 和 2 张 12。该玩家记 0 分，其他每位玩家记 50 分。实现神风特攻队的玩家可以宣告 CABO。</p>
                  <h2 className="line-title">每轮结束</h2>
                  <p>当（1）一个玩家已经宣告 CABO 并且其他玩家都再<span className="last-row">进行了一回合后，或者（2）牌库被耗尽时，本轮结束。</span></p>
                  <p>如果游戏尚未结束，将牌洗混之后再进行一轮。上一轮得分最低的玩家成为新的起始玩家。如果出现平<span className="last-row">手，最靠近上一位起始玩家的玩家成为新的起始玩家。</span></p>
                  <h2 className="line-title">记分</h2>
                  <p>你的本轮得分为本轮结束时你面前的牌的数字总和。</p>
                  <p>但是，如果是由你宣告 CABO 并且你的数字总和最低（或者最低但与他人平手），你记 0 分；如果是由你宣告 CABO 但你的数字总和不是最低，记你面前的牌的数字总和的分数，并额外加 10 分。</p>
                  <p className="last-row">记录所有玩家本轮的分数，并且与之前轮的分数加总。</p>
                  <h2 className="line-title">游戏结束</h2>
                  <p>游戏会在有一位玩家分数超过 100 时结束。此时分数最低的玩家获胜。如果出现平手，最后一轮得分更低的玩家获胜。</p>
                  <h2 className="line-title">分数重置</h2>
                  <p>若一轮结束后，一位玩家的总分恰好为 100 分，将他<span className="last-row">的分数重置到 50 分。每位玩家每局游戏只能重置一次。</span></p>
                  <p className="worker-sign">翻译：雪松 &emsp; <span className="my-sign">描改：楚滨</span></p>
              </div>
            </main>
          </div> : (
            <div className="starting">

              <div onClick={() => viewRule(true)}>
                <span className="keyword const"></span>

                <span className="var">rule</span>

                <span className="mark semicolon"></span>
              </div>

              <div onClick={() => setGamePlayer(2)}>
                <span className="keyword const"></span>

                <span className="var">start</span>

                <span className="mark semicolon"></span>
              </div>

              {/*<p><span className="var">export <em>class</em></span> <span className="number">Player</span> <span className="boolean">extends</span> <em className="method">gameStarter</em> {'{'}</p>
              <div className="playerBtn">
                <span className="method">solo</span> () {'{'}
                <div className="playerBtn">
                  <span><span className="btn method" onClick={() => setGamePlayer(2)}>easyMode</span>() <span className="mark semicolon"></span></span>
                  <br />
                  <span><span className="btn method" onClick={() => setGamePlayer(2, true)}>hardMode</span>() <span className="mark semicolon"></span></span>
                </div>
                <span>{'}'}</span>
              </div>
              <div className="playerBtn" onClick={() => setGamePlayer(3)}><span className="btn method">trine</span> () {'{}'}</div>
              <div className="playerBtn" onClick={() => setGamePlayer(4)}><span className="btn method">quater</span> () {'{}'}</div>
              <p>{'}'}</p>*/}
            </div>
          )
        )
      }
    </div>
  );

}

export default App;
